package com.ozkaslibasar.financeproject.adapter.outbound.persistence;

import com.ozkaslibasar.financeproject.adapter.outbound.persistence.entity.PortfolioStateEntity;
import com.ozkaslibasar.financeproject.adapter.outbound.persistence.entity.PortfolioStateEventEntity;
import com.ozkaslibasar.financeproject.adapter.outbound.persistence.entity.PortfolioStateValuationEntity;
import com.ozkaslibasar.financeproject.adapter.outbound.persistence.repository.PortfolioStateEventJpaRepository;
import com.ozkaslibasar.financeproject.adapter.outbound.persistence.repository.PortfolioStateJpaRepository;
import com.ozkaslibasar.financeproject.adapter.outbound.persistence.repository.PortfolioStateValuationJpaRepository;
import com.ozkaslibasar.financeproject.domain.model.ExposureStatus;
import com.ozkaslibasar.financeproject.domain.model.StoredPortfolioState;
import com.ozkaslibasar.financeproject.domain.model.ValuationInput;
import com.ozkaslibasar.financeproject.domain.port.outbound.PortfolioStatePort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

/**
 * Insert-only: a stored state is never updated or deleted by the application, so a version always replays the
 * same events and valuation inputs. A concurrent duplicate save loses the unique-key race harmlessly.
 */
@Component
@RequiredArgsConstructor
public class PortfolioStateRepositoryAdapter implements PortfolioStatePort {

    private final PortfolioStateJpaRepository states;
    private final PortfolioStateEventJpaRepository events;
    private final PortfolioStateValuationJpaRepository valuations;

    @Override
    @Transactional
    public SaveResult saveIfAbsent(StoredPortfolioState state) {
        int inserted = states.insertIfAbsent(state.portfolioId(), state.userId(), state.version(), state.asOf(),
                state.baseCurrency(), state.exposureStatus().name());
        PortfolioStateEntity head = states.findByPortfolioIdAndVersion(state.portfolioId(), state.version())
                .orElseThrow(() -> new IllegalStateException("Portfolio state " + state.version() + " was not stored"));
        if (inserted == 0) {
            return new SaveResult(toDomain(head), false);
        }
        events.saveAll(state.eventIds().stream()
                .map(id -> new PortfolioStateEventEntity(head.getId(), id)).toList());
        valuations.saveAll(state.valuationInputs().stream()
                .map(i -> new PortfolioStateValuationEntity(head.getId(), i.symbol(), i.close(), i.priceDate(),
                        i.priceCurrency()))
                .toList());
        events.flush();
        valuations.flush();
        return new SaveResult(toDomain(head), true);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<StoredPortfolioState> findByVersion(Long portfolioId, String userId, String version) {
        return states.findByPortfolioIdAndUserIdAndVersion(portfolioId, userId, version).map(this::toDomain);
    }

    private StoredPortfolioState toDomain(PortfolioStateEntity e) {
        List<Long> eventIds = events.findByStateIdOrderByTransactionIdAsc(e.getId()).stream()
                .map(PortfolioStateEventEntity::getTransactionId).toList();
        List<ValuationInput> inputs = valuations.findByStateIdOrderBySymbolAsc(e.getId()).stream()
                .map(v -> new ValuationInput(v.getSymbol(), v.getClose(), v.getPriceDate(), v.getPriceCurrency()))
                .toList();
        return new StoredPortfolioState(e.getVersion(), e.getPortfolioId(), e.getUserId(), e.getAsOf(),
                e.getBaseCurrency(), ExposureStatus.valueOf(e.getExposureStatus()), eventIds, inputs,
                e.getCreatedAt());
    }
}
