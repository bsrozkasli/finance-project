package com.ozkaslibasar.financeproject.adapter.inbound.rest;

import com.ozkaslibasar.financeproject.domain.model.Portfolio;
import com.ozkaslibasar.financeproject.domain.model.PortfolioAssetType;
import com.ozkaslibasar.financeproject.domain.model.PortfolioPosition;
import com.ozkaslibasar.financeproject.domain.model.PortfolioTransaction;
import com.ozkaslibasar.financeproject.domain.model.PortfolioTransactionAction;
import com.ozkaslibasar.financeproject.domain.model.PortfolioTransactionSource;
import com.ozkaslibasar.financeproject.domain.port.outbound.PortfolioPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.PortfolioPositionPort;
import com.ozkaslibasar.financeproject.domain.service.PortfolioLedgerService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = PortfolioPositionController.class)
class PortfolioPositionControllerTest {

    private static final String BASE_PATH = "/api/v1/portfolio/positions";
    private static final String DEFAULT_USER = "default";
    private static final LocalDate OPENED_AT = LocalDate.of(2026, 6, 30);
    private static final LocalDateTime CREATED_AT = LocalDateTime.of(2026, 6, 30, 10, 15, 0);
    private static final LocalDateTime UPDATED_AT = LocalDateTime.of(2026, 6, 30, 11, 45, 0);
    private static final BigDecimal QTY_10_5 = new BigDecimal("10.5");
    private static final BigDecimal COST_190_25 = new BigDecimal("190.25");
    private static final String NOTES = "Long-term position";

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private PortfolioPositionPort positionPort;

    @MockitoBean
    private PortfolioPort portfolioPort;

    @MockitoBean
    private PortfolioLedgerService ledgerService;

    @Test
    void shouldListPositionsForDefaultUserAndPreserveResponseContract() throws Exception {
        PortfolioPosition first = position(1L, "AAPL", new BigDecimal("10.5"), new BigDecimal("190.25"), OPENED_AT);
        PortfolioPosition second = position(2L, "MSFT", new BigDecimal("3.0"), new BigDecimal("420.10"), LocalDate.of(2026, 6, 29));
        when(positionPort.findByUserId(DEFAULT_USER)).thenReturn(List.of(first, second));

        mockMvc.perform(get(BASE_PATH).accept(APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(APPLICATION_JSON))
                .andExpect(jsonPath("$[0].id").value(1))
                .andExpect(jsonPath("$[0].userId").value(DEFAULT_USER))
                .andExpect(jsonPath("$[0].symbol").value("AAPL"))
                .andExpect(jsonPath("$[0].quantity").value(10.5))
                .andExpect(jsonPath("$[0].avgCostPrice").value(190.25))
                .andExpect(jsonPath("$[0].openedAt").value("2026-06-30"))
                .andExpect(jsonPath("$[0].notes").value(NOTES))
                .andExpect(jsonPath("$[0].createdAt").value("2026-06-30T10:15:00"))
                .andExpect(jsonPath("$[0].updatedAt").value("2026-06-30T11:45:00"))
                .andExpect(jsonPath("$[1].id").value(2))
                .andExpect(jsonPath("$[1].symbol").value("MSFT"))
                .andExpect(jsonPath("$[1].quantity").value(3.0))
                .andExpect(jsonPath("$[1].avgCostPrice").value(420.10))
                .andExpect(jsonPath("$[0].ticker").doesNotExist())
                .andExpect(jsonPath("$[0].averageCost").doesNotExist())
                .andExpect(jsonPath("$[0].avgPrice").doesNotExist())
                .andExpect(jsonPath("$[0].openDate").doesNotExist());

        verify(positionPort).findByUserId(DEFAULT_USER);
        verifyNoInteractions(portfolioPort, ledgerService);
    }

    @Test
    void shouldReturnEmptyArrayWhenUserHasNoPositions() throws Exception {
        when(positionPort.findByUserId(DEFAULT_USER)).thenReturn(List.of());

        mockMvc.perform(get(BASE_PATH).accept(APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(content().json("[]"));

        verify(positionPort).findByUserId(DEFAULT_USER);
        verifyNoInteractions(portfolioPort, ledgerService);
    }

    @Test
    void shouldClarifyNullPositionListContract() {
    }

    @Test
    void shouldCreatePositionForDefaultUserAndSyncLedgerWithExistingDefaultPortfolio() throws Exception {
        PortfolioPosition persisted = position(42L, "AAPL", QTY_10_5, COST_190_25, OPENED_AT);
        Portfolio nonDefault = portfolio(10L, "Main", "EUR", false);
        Portfolio defaultPortfolio = portfolio(11L, "Default", "USD", true);

        when(positionPort.save(any(PortfolioPosition.class))).thenReturn(persisted);
        when(portfolioPort.findByUserId(DEFAULT_USER)).thenReturn(List.of(nonDefault, defaultPortfolio));
        when(ledgerService.addTransaction(any(PortfolioTransaction.class)))
                .thenReturn(transaction(501L, 11L, "AAPL", QTY_10_5, COST_190_25, OPENED_AT, "USD"));

        mockMvc.perform(post(BASE_PATH)
                        .contentType(APPLICATION_JSON)
                        .accept(APPLICATION_JSON)
                        .content(validCreateBody("AAPL", QTY_10_5, COST_190_25, "\"2026-06-30\"", "\"" + NOTES + "\"")))
                .andExpect(status().isCreated())
                .andExpect(content().contentTypeCompatibleWith(APPLICATION_JSON))
                .andExpect(jsonPath("$.id").value(42))
                .andExpect(jsonPath("$.userId").value(DEFAULT_USER))
                .andExpect(jsonPath("$.symbol").value("AAPL"))
                .andExpect(jsonPath("$.quantity").value(10.5))
                .andExpect(jsonPath("$.avgCostPrice").value(190.25))
                .andExpect(jsonPath("$.openedAt").value("2026-06-30"))
                .andExpect(jsonPath("$.notes").value(NOTES));

        ArgumentCaptor<PortfolioPosition> savedCaptor = ArgumentCaptor.forClass(PortfolioPosition.class);
        ArgumentCaptor<PortfolioTransaction> txCaptor = ArgumentCaptor.forClass(PortfolioTransaction.class);
        verify(positionPort).save(savedCaptor.capture());
        verify(portfolioPort).findByUserId(DEFAULT_USER);
        verify(portfolioPort, never()).save(any(Portfolio.class));
        verify(ledgerService).addTransaction(txCaptor.capture());
        verifyNoMoreInteractions(positionPort, portfolioPort, ledgerService);

        PortfolioPosition toSave = savedCaptor.getValue();
        assertThat(toSave.id()).isNull();
        assertThat(toSave.userId()).isEqualTo(DEFAULT_USER);
        assertThat(toSave.symbol()).isEqualTo("AAPL");
        assertThat(toSave.quantity()).isEqualByComparingTo("10.5");
        assertThat(toSave.avgCostPrice()).isEqualByComparingTo("190.25");
        assertThat(toSave.openedAt()).isEqualTo(OPENED_AT);
        assertThat(toSave.notes()).isEqualTo(NOTES);
        assertThat(toSave.createdAt()).isNull();
        assertThat(toSave.updatedAt()).isNull();

        PortfolioTransaction tx = txCaptor.getValue();
        assertThat(tx.portfolioId()).isEqualTo(11L);
        assertThat(tx.userId()).isEqualTo(DEFAULT_USER);
        assertThat(tx.symbol()).isEqualTo("AAPL");
        assertThat(tx.action()).isEqualTo(PortfolioTransactionAction.BUY);
        assertThat(tx.assetType()).isEqualTo(PortfolioAssetType.US_STOCK);
        assertThat(tx.quantity()).isEqualByComparingTo("10.5");
        assertThat(tx.price()).isEqualByComparingTo("190.25");
        assertThat(tx.currency()).isEqualTo("USD");
        assertThat(tx.fee()).isEqualByComparingTo("0");
        assertThat(tx.fxRateToBase()).isEqualByComparingTo("1");
        assertThat(tx.tradeDate()).isEqualTo(OPENED_AT);
        assertThat(tx.source()).isEqualTo(PortfolioTransactionSource.MANUAL);
        assertThat(tx.notes()).isEqualTo(NOTES);
    }

    @ParameterizedTest
    @ValueSource(strings = {"AAPL", "aapl", "AaPl"})
    void shouldDelegateCreateSymbolVariantWithoutControllerNormalization(String symbol) throws Exception {
        when(positionPort.save(any(PortfolioPosition.class)))
                .thenReturn(position(1L, symbol, QTY_10_5, COST_190_25, OPENED_AT));
        when(portfolioPort.findByUserId(DEFAULT_USER)).thenReturn(List.of(portfolio(11L, "Default", "USD", true)));
        when(ledgerService.addTransaction(any(PortfolioTransaction.class)))
                .thenReturn(transaction(101L, 11L, symbol, QTY_10_5, COST_190_25, OPENED_AT, "USD"));

        mockMvc.perform(post(BASE_PATH)
                        .contentType(APPLICATION_JSON)
                        .content(validCreateBody(symbol, QTY_10_5, COST_190_25, "\"2026-06-30\"", "\"" + NOTES + "\"")))
                .andExpect(status().isCreated());

        ArgumentCaptor<PortfolioPosition> captor = ArgumentCaptor.forClass(PortfolioPosition.class);
        verify(positionPort).save(captor.capture());
        assertThat(captor.getValue().symbol()).isEqualTo(symbol);
    }

    @Test
    void shouldKeepSurroundingWhitespaceInPositionSymbolButNormalizeLedgerSymbol() throws Exception {
        String symbolWithWhitespace = " AaPl ";
        when(positionPort.save(any(PortfolioPosition.class)))
                .thenReturn(position(2L, symbolWithWhitespace, QTY_10_5, COST_190_25, OPENED_AT));
        when(portfolioPort.findByUserId(DEFAULT_USER)).thenReturn(List.of(portfolio(11L, "Default", "USD", true)));

        mockMvc.perform(post(BASE_PATH)
                        .contentType(APPLICATION_JSON)
                        .content(validCreateBody(symbolWithWhitespace, QTY_10_5, COST_190_25, "\"2026-06-30\"", "\"" + NOTES + "\"")))
                .andExpect(status().isCreated());

        ArgumentCaptor<PortfolioPosition> positionCaptor = ArgumentCaptor.forClass(PortfolioPosition.class);
        ArgumentCaptor<PortfolioTransaction> txCaptor = ArgumentCaptor.forClass(PortfolioTransaction.class);
        verify(positionPort).save(positionCaptor.capture());
        verify(ledgerService).addTransaction(txCaptor.capture());

        assertThat(positionCaptor.getValue().symbol()).isEqualTo(" AaPl ");
        assertThat(txCaptor.getValue().symbol()).isEqualTo("AAPL");
    }

    @Test
    void shouldReturn400WhenCreatingWithBlankSymbol() throws Exception {
        mockMvc.perform(post(BASE_PATH)
                        .contentType(APPLICATION_JSON)
                        .accept(APPLICATION_JSON)
                        .content(validCreateBody("", QTY_10_5, COST_190_25, "\"2026-06-30\"", "\"" + NOTES + "\"")))
                .andExpect(status().isBadRequest());
    }

    @Test
    void shouldReturn400WhenCreatingWithWhitespaceOnlySymbol() throws Exception {
        mockMvc.perform(post(BASE_PATH)
                        .contentType(APPLICATION_JSON)
                        .accept(APPLICATION_JSON)
                        .content(validCreateBody("   ", QTY_10_5, COST_190_25, "\"2026-06-30\"", "\"" + NOTES + "\"")))
                .andExpect(status().isBadRequest());
    }

    @Test
    void shouldReturn400WhenCreatingWithNullSymbol() throws Exception {
        mockMvc.perform(post(BASE_PATH)
                        .contentType(APPLICATION_JSON)
                        .accept(APPLICATION_JSON)
                        .content(validCreateBody(null, QTY_10_5, COST_190_25, "\"2026-06-30\"", "\"" + NOTES + "\"")))
                .andExpect(status().isBadRequest());
    }

    @Test
    void shouldReturn400WhenCreatingWithZeroQuantity() throws Exception {
        mockMvc.perform(post(BASE_PATH)
                        .contentType(APPLICATION_JSON)
                        .accept(APPLICATION_JSON)
                        .content(validCreateBody("AAPL", BigDecimal.ZERO, COST_190_25, "\"2026-06-30\"", "\"" + NOTES + "\"")))
                .andExpect(status().isBadRequest());
    }

    @Test
    void shouldReturn400WhenCreatingWithNegativeQuantity() throws Exception {
        mockMvc.perform(post(BASE_PATH)
                        .contentType(APPLICATION_JSON)
                        .accept(APPLICATION_JSON)
                        .content(validCreateBody("AAPL", new BigDecimal("-1"), COST_190_25, "\"2026-06-30\"", "\"" + NOTES + "\"")))
                .andExpect(status().isBadRequest());
    }

    @Test
    void shouldReturn400WhenCreatingWithNullQuantity() throws Exception {
        mockMvc.perform(post(BASE_PATH)
                        .contentType(APPLICATION_JSON)
                        .accept(APPLICATION_JSON)
                        .content(validCreateBody("AAPL", null, COST_190_25, "\"2026-06-30\"", "\"" + NOTES + "\"")))
                .andExpect(status().isBadRequest());
    }

    @Test
    void shouldRejectStringQuantityBeforePersistence() throws Exception {
        mockMvc.perform(post(BASE_PATH)
                        .contentType(APPLICATION_JSON)
                        .accept(APPLICATION_JSON)
                        .content("""
                                {
                                  "symbol": "AAPL",
                                  "quantity": "oops",
                                  "avgCostPrice": 190.25,
                                  "openedAt": "2026-06-30",
                                  "notes": "Long-term position"
                                }
                                """))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(positionPort, portfolioPort, ledgerService);
    }

    @Test
    void shouldReturn400WhenCreatingWithNegativeAvgCostPrice() throws Exception {
        mockMvc.perform(post(BASE_PATH)
                        .contentType(APPLICATION_JSON)
                        .accept(APPLICATION_JSON)
                        .content(validCreateBody("AAPL", QTY_10_5, new BigDecimal("-0.01"), "\"2026-06-30\"", "\"" + NOTES + "\"")))
                .andExpect(status().isBadRequest());
    }

    @Test
    void shouldAllowZeroAvgCostPriceOnCreate() throws Exception {
        when(positionPort.save(any(PortfolioPosition.class)))
                .thenReturn(position(100L, "AAPL", QTY_10_5, BigDecimal.ZERO, OPENED_AT));
        when(portfolioPort.findByUserId(DEFAULT_USER)).thenReturn(List.of(portfolio(11L, "Default", "USD", true)));

        mockMvc.perform(post(BASE_PATH)
                        .contentType(APPLICATION_JSON)
                        .accept(APPLICATION_JSON)
                        .content(validCreateBody("AAPL", QTY_10_5, BigDecimal.ZERO, "\"2026-06-30\"", "\"" + NOTES + "\"")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.avgCostPrice").value(0));
    }

    @Test
    void shouldReturn400ForMalformedCreateBody() throws Exception {
        mockMvc.perform(post(BASE_PATH)
                        .contentType(APPLICATION_JSON)
                        .accept(APPLICATION_JSON)
                        .content("{\"symbol\":\"AAPL\","))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(positionPort, portfolioPort, ledgerService);
    }

    @Test
    void shouldReturn400ForArrayInsteadOfObjectBody() throws Exception {
        mockMvc.perform(post(BASE_PATH)
                        .contentType(APPLICATION_JSON)
                        .accept(APPLICATION_JSON)
                        .content("""
                                [
                                  {
                                    "symbol":"AAPL",
                                    "quantity":10.5,
                                    "avgCostPrice":190.25
                                  }
                                ]
                                """))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(positionPort, portfolioPort, ledgerService);
    }

    @Test
    void shouldReturn400ForInvalidOpenedAtFormat() throws Exception {
        mockMvc.perform(post(BASE_PATH)
                        .contentType(APPLICATION_JSON)
                        .accept(APPLICATION_JSON)
                        .content(validCreateBody("AAPL", QTY_10_5, COST_190_25, "\"2026-13-30\"", "\"" + NOTES + "\"")))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(positionPort, portfolioPort, ledgerService);
    }

    @Test
    void shouldClarifyUnknownJsonFieldPolicyOnCreate() {
    }

    @Test
    void shouldAssignOpenedAtWithinRequestRangeAndUseSameDateForLedger() throws Exception {
        when(positionPort.save(any(PortfolioPosition.class)))
                .thenReturn(position(50L, "AAPL", QTY_10_5, COST_190_25, OPENED_AT));
        when(portfolioPort.findByUserId(DEFAULT_USER)).thenReturn(List.of(portfolio(11L, "Default", "USD", true)));

        LocalDate before = LocalDate.now();
        mockMvc.perform(post(BASE_PATH)
                        .contentType(APPLICATION_JSON)
                        .accept(APPLICATION_JSON)
                        .content(validCreateBody("AAPL", QTY_10_5, COST_190_25, "null", "\"" + NOTES + "\"")))
                .andExpect(status().isCreated());
        LocalDate after = LocalDate.now();

        ArgumentCaptor<PortfolioPosition> positionCaptor = ArgumentCaptor.forClass(PortfolioPosition.class);
        ArgumentCaptor<PortfolioTransaction> txCaptor = ArgumentCaptor.forClass(PortfolioTransaction.class);
        verify(positionPort).save(positionCaptor.capture());
        verify(ledgerService).addTransaction(txCaptor.capture());

        LocalDate savedOpenedAt = positionCaptor.getValue().openedAt();
        LocalDate tradeDate = txCaptor.getValue().tradeDate();
        assertThat(savedOpenedAt).isBetween(before, after);
        assertThat(tradeDate).isBetween(before, after);
        assertThat(savedOpenedAt).isEqualTo(tradeDate);
    }

    @Test
    void shouldNotRunPortfolioLookupOrLedgerWhenPositionSaveFails() throws Exception {
        when(positionPort.save(any(PortfolioPosition.class))).thenThrow(new RuntimeException("persistence unavailable"));

        assertThatThrownBy(() -> mockMvc.perform(post(BASE_PATH)
                .contentType(APPLICATION_JSON)
                .accept(APPLICATION_JSON)
                .content(validCreateBody("AAPL", QTY_10_5, COST_190_25, "\"2026-06-30\"", "\"" + NOTES + "\""))))
                .hasRootCauseInstanceOf(RuntimeException.class)
                .hasRootCauseMessage("persistence unavailable");

        verify(positionPort).save(any(PortfolioPosition.class));
        verifyNoInteractions(portfolioPort, ledgerService);
    }

    @Test
    void shouldCreateDefaultPortfolioWhenMissingAndThenCreateLedgerTransaction() throws Exception {
        PortfolioPosition persisted = position(60L, "AAPL", QTY_10_5, COST_190_25, OPENED_AT);
        Portfolio createdPortfolio = portfolio(77L, "Default Portfolio", "USD", true);
        when(positionPort.save(any(PortfolioPosition.class))).thenReturn(persisted);
        when(portfolioPort.findByUserId(DEFAULT_USER)).thenReturn(List.of());
        when(portfolioPort.save(any(Portfolio.class))).thenReturn(createdPortfolio);

        mockMvc.perform(post(BASE_PATH)
                        .contentType(APPLICATION_JSON)
                        .accept(APPLICATION_JSON)
                        .content(validCreateBody("AAPL", QTY_10_5, COST_190_25, "\"2026-06-30\"", "\"" + NOTES + "\"")))
                .andExpect(status().isCreated());

        ArgumentCaptor<Portfolio> createdPortfolioCaptor = ArgumentCaptor.forClass(Portfolio.class);
        ArgumentCaptor<PortfolioTransaction> txCaptor = ArgumentCaptor.forClass(PortfolioTransaction.class);
        InOrder inOrder = inOrder(positionPort, portfolioPort, ledgerService);
        inOrder.verify(positionPort).save(any(PortfolioPosition.class));
        inOrder.verify(portfolioPort).findByUserId(DEFAULT_USER);
        inOrder.verify(portfolioPort).save(createdPortfolioCaptor.capture());
        inOrder.verify(ledgerService).addTransaction(txCaptor.capture());

        Portfolio newPortfolio = createdPortfolioCaptor.getValue();
        assertThat(newPortfolio.id()).isNull();
        assertThat(newPortfolio.userId()).isEqualTo(DEFAULT_USER);
        assertThat(newPortfolio.name()).isEqualTo("Default Portfolio");
        assertThat(newPortfolio.baseCurrency()).isEqualTo("USD");
        assertThat(newPortfolio.defaultPortfolio()).isTrue();

        PortfolioTransaction tx = txCaptor.getValue();
        assertThat(tx.portfolioId()).isEqualTo(77L);
        assertThat(tx.currency()).isEqualTo("USD");
        assertThat(tx.action()).isEqualTo(PortfolioTransactionAction.BUY);
    }

    @Test
    void shouldClarifyPortfolioSelectionWhenNoDefaultExists() {
    }

    @Test
    void shouldExposeLedgerSyncFailureInsteadOfReturningFalseSuccess() throws Exception {
        when(positionPort.save(any(PortfolioPosition.class)))
                .thenReturn(position(88L, "AAPL", QTY_10_5, COST_190_25, OPENED_AT));
        when(portfolioPort.findByUserId(DEFAULT_USER)).thenReturn(List.of(portfolio(11L, "Default", "USD", true)));
        when(ledgerService.addTransaction(any(PortfolioTransaction.class)))
                .thenThrow(new RuntimeException("ledger write failed"));

        mockMvc.perform(post(BASE_PATH)
                        .contentType(APPLICATION_JSON)
                        .accept(APPLICATION_JSON)
                        .content(validCreateBody("AAPL", QTY_10_5, COST_190_25, "\"2026-06-30\"", "\"" + NOTES + "\"")))
                .andExpect(status().is5xxServerError());
    }

    @Test
    void shouldExposePortfolioLookupFailureInsteadOfReturningFalseSuccess() throws Exception {
        when(positionPort.save(any(PortfolioPosition.class)))
                .thenReturn(position(89L, "AAPL", QTY_10_5, COST_190_25, OPENED_AT));
        when(portfolioPort.findByUserId(DEFAULT_USER)).thenThrow(new RuntimeException("portfolio lookup failed"));

        mockMvc.perform(post(BASE_PATH)
                        .contentType(APPLICATION_JSON)
                        .accept(APPLICATION_JSON)
                        .content(validCreateBody("AAPL", QTY_10_5, COST_190_25, "\"2026-06-30\"", "\"" + NOTES + "\"")))
                .andExpect(status().is5xxServerError());
    }

    @Test
    void shouldExposeDefaultPortfolioCreationFailureInsteadOfReturningFalseSuccess() throws Exception {
        when(positionPort.save(any(PortfolioPosition.class)))
                .thenReturn(position(90L, "AAPL", QTY_10_5, COST_190_25, OPENED_AT));
        when(portfolioPort.findByUserId(DEFAULT_USER)).thenReturn(List.of());
        when(portfolioPort.save(any(Portfolio.class))).thenThrow(new RuntimeException("portfolio create failed"));

        mockMvc.perform(post(BASE_PATH)
                        .contentType(APPLICATION_JSON)
                        .accept(APPLICATION_JSON)
                        .content(validCreateBody("AAPL", QTY_10_5, COST_190_25, "\"2026-06-30\"", "\"" + NOTES + "\"")))
                .andExpect(status().is5xxServerError());
    }

    @Test
    void shouldClarifyNullPortfolioPortContracts() {
    }

    @Test
    void shouldUpdateExistingPositionForDefaultUser() throws Exception {
        PortfolioPosition existing = position(42L, "AAPL", QTY_10_5, COST_190_25, OPENED_AT);
        PortfolioPosition persisted = position(42L, "MSFT", new BigDecimal("7.25"), new BigDecimal("320.10"), LocalDate.of(2026, 7, 1));
        when(positionPort.findByIdAndUserId(42L, DEFAULT_USER)).thenReturn(Optional.of(existing));
        when(positionPort.save(any(PortfolioPosition.class))).thenReturn(persisted);

        mockMvc.perform(put(BASE_PATH + "/42")
                        .contentType(APPLICATION_JSON)
                        .accept(APPLICATION_JSON)
                        .content(validCreateBody("MSFT", new BigDecimal("7.25"), new BigDecimal("320.10"), "\"2026-07-01\"", "\"Updated\"")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(42))
                .andExpect(jsonPath("$.userId").value(DEFAULT_USER))
                .andExpect(jsonPath("$.symbol").value("MSFT"))
                .andExpect(jsonPath("$.quantity").value(7.25))
                .andExpect(jsonPath("$.avgCostPrice").value(320.10));

        ArgumentCaptor<PortfolioPosition> captor = ArgumentCaptor.forClass(PortfolioPosition.class);
        verify(positionPort).findByIdAndUserId(42L, DEFAULT_USER);
        verify(positionPort).save(captor.capture());
        verifyNoInteractions(portfolioPort, ledgerService);

        PortfolioPosition toSave = captor.getValue();
        assertThat(toSave.id()).isEqualTo(42L);
        assertThat(toSave.userId()).isEqualTo(DEFAULT_USER);
        assertThat(toSave.symbol()).isEqualTo("MSFT");
    }

    @Test
    void shouldReturn404WhenUpdatingMissingPosition() throws Exception {
        when(positionPort.findByIdAndUserId(404L, DEFAULT_USER)).thenReturn(Optional.empty());

        mockMvc.perform(put(BASE_PATH + "/404")
                        .contentType(APPLICATION_JSON)
                        .accept(APPLICATION_JSON)
                        .content(validCreateBody("AAPL", QTY_10_5, COST_190_25, "\"2026-06-30\"", "\"" + NOTES + "\"")))
                .andExpect(status().isNotFound())
                .andExpect(status().reason("Position not found: 404"));

        verify(positionPort).findByIdAndUserId(404L, DEFAULT_USER);
        verify(positionPort, never()).save(any(PortfolioPosition.class));
        verifyNoInteractions(portfolioPort, ledgerService);
    }

    @Test
    void shouldReturn400WhenUpdatingWithBlankSymbol() throws Exception {
        when(positionPort.findByIdAndUserId(42L, DEFAULT_USER))
                .thenReturn(Optional.of(position(42L, "AAPL", QTY_10_5, COST_190_25, OPENED_AT)));

        mockMvc.perform(put(BASE_PATH + "/42")
                        .contentType(APPLICATION_JSON)
                        .accept(APPLICATION_JSON)
                        .content(validCreateBody("", QTY_10_5, COST_190_25, "\"2026-06-30\"", "\"" + NOTES + "\"")))
                .andExpect(status().isBadRequest());
    }

    @Test
    void shouldReturn400WhenUpdatingWithZeroQuantity() throws Exception {
        when(positionPort.findByIdAndUserId(42L, DEFAULT_USER))
                .thenReturn(Optional.of(position(42L, "AAPL", QTY_10_5, COST_190_25, OPENED_AT)));

        mockMvc.perform(put(BASE_PATH + "/42")
                        .contentType(APPLICATION_JSON)
                        .accept(APPLICATION_JSON)
                        .content(validCreateBody("AAPL", BigDecimal.ZERO, COST_190_25, "\"2026-06-30\"", "\"" + NOTES + "\"")))
                .andExpect(status().isBadRequest());
    }

    @Test
    void shouldReturn400WhenUpdatingWithNegativeAvgCostPrice() throws Exception {
        when(positionPort.findByIdAndUserId(42L, DEFAULT_USER))
                .thenReturn(Optional.of(position(42L, "AAPL", QTY_10_5, COST_190_25, OPENED_AT)));

        mockMvc.perform(put(BASE_PATH + "/42")
                        .contentType(APPLICATION_JSON)
                        .accept(APPLICATION_JSON)
                        .content(validCreateBody("AAPL", QTY_10_5, new BigDecimal("-1"), "\"2026-06-30\"", "\"" + NOTES + "\"")))
                .andExpect(status().isBadRequest());
    }

    @Test
    void shouldReturn400WhenUpdatePathIdIsNotNumeric() throws Exception {
        mockMvc.perform(put(BASE_PATH + "/not-a-number")
                        .contentType(APPLICATION_JSON)
                        .accept(APPLICATION_JSON)
                        .content(validCreateBody("AAPL", QTY_10_5, COST_190_25, "\"2026-06-30\"", "\"" + NOTES + "\"")))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(positionPort, portfolioPort, ledgerService);
    }

    @Test
    void shouldReturn404WhenUpdateTargetIsNotFoundForNegativeAndZeroIds() throws Exception {
        when(positionPort.findByIdAndUserId(eq(-1L), eq(DEFAULT_USER))).thenReturn(Optional.empty());
        when(positionPort.findByIdAndUserId(eq(0L), eq(DEFAULT_USER))).thenReturn(Optional.empty());

        mockMvc.perform(put(BASE_PATH + "/-1")
                        .contentType(APPLICATION_JSON)
                        .content(validCreateBody("AAPL", QTY_10_5, COST_190_25, "\"2026-06-30\"", "\"" + NOTES + "\"")))
                .andExpect(status().isNotFound());
        mockMvc.perform(put(BASE_PATH + "/0")
                        .contentType(APPLICATION_JSON)
                        .content(validCreateBody("AAPL", QTY_10_5, COST_190_25, "\"2026-06-30\"", "\"" + NOTES + "\"")))
                .andExpect(status().isNotFound());

        verify(positionPort).findByIdAndUserId(-1L, DEFAULT_USER);
        verify(positionPort).findByIdAndUserId(0L, DEFAULT_USER);
        verify(positionPort, never()).save(any(PortfolioPosition.class));
    }

    @Test
    void shouldClarifyLedgerBehaviorOnPositionUpdate() {
    }

    @Test
    void shouldDeletePositionOnlyAfterOwnershipCheck() throws Exception {
        when(positionPort.findByIdAndUserId(42L, DEFAULT_USER))
                .thenReturn(Optional.of(position(42L, "AAPL", QTY_10_5, COST_190_25, OPENED_AT)));

        mockMvc.perform(delete(BASE_PATH + "/42"))
                .andExpect(status().isNoContent())
                .andExpect(content().string(""));

        InOrder inOrder = inOrder(positionPort);
        inOrder.verify(positionPort).findByIdAndUserId(42L, DEFAULT_USER);
        inOrder.verify(positionPort).deleteByIdAndUserId(42L, DEFAULT_USER);
        verifyNoInteractions(portfolioPort, ledgerService);
    }

    @Test
    void shouldReturn404WhenDeletingMissingPosition() throws Exception {
        when(positionPort.findByIdAndUserId(404L, DEFAULT_USER)).thenReturn(Optional.empty());

        mockMvc.perform(delete(BASE_PATH + "/404"))
                .andExpect(status().isNotFound())
                .andExpect(status().reason("Position not found: 404"));

        verify(positionPort).findByIdAndUserId(404L, DEFAULT_USER);
        verify(positionPort, never()).deleteByIdAndUserId(any(Long.class), any(String.class));
        verifyNoInteractions(portfolioPort, ledgerService);
    }

    @Test
    void shouldNotReturnFalseNoContentWhenDeleteFails() throws Exception {
        when(positionPort.findByIdAndUserId(42L, DEFAULT_USER))
                .thenReturn(Optional.of(position(42L, "AAPL", QTY_10_5, COST_190_25, OPENED_AT)));
        org.mockito.Mockito.doThrow(new RuntimeException("delete failure"))
                .when(positionPort).deleteByIdAndUserId(42L, DEFAULT_USER);

        assertThatThrownBy(() -> mockMvc.perform(delete(BASE_PATH + "/42")))
                .hasRootCauseInstanceOf(RuntimeException.class)
                .hasRootCauseMessage("delete failure");

        verify(positionPort).findByIdAndUserId(42L, DEFAULT_USER);
        verify(positionPort).deleteByIdAndUserId(42L, DEFAULT_USER);
    }

    @Test
    void shouldClarifyLedgerBehaviorOnPositionDelete() {
    }

    @Test
    void shouldRejectUnsupportedHttpMethodsAndOutOfScopeRoutes() throws Exception {
        mockMvc.perform(post(BASE_PATH + "/42")).andExpect(status().is4xxClientError());
        mockMvc.perform(patch(BASE_PATH + "/42")).andExpect(status().is4xxClientError());
        mockMvc.perform(get(BASE_PATH + "/42")).andExpect(status().is4xxClientError());
        mockMvc.perform(delete(BASE_PATH)).andExpect(status().is4xxClientError());
        mockMvc.perform(put(BASE_PATH)).andExpect(status().is4xxClientError());
    }

    @Test
    void shouldRejectUnsupportedContentTypeForCreate() throws Exception {
        mockMvc.perform(post(BASE_PATH)
                        .contentType(MediaType.TEXT_PLAIN)
                        .content(validCreateBody("AAPL", QTY_10_5, COST_190_25, "\"2026-06-30\"", "\"" + NOTES + "\"")))
                .andExpect(status().isUnsupportedMediaType());

        verifyNoInteractions(positionPort, portfolioPort, ledgerService);
    }

    @Test
    void shouldRejectMissingContentTypeForCreate() throws Exception {
        mockMvc.perform(post(BASE_PATH)
                        .content(validCreateBody("AAPL", QTY_10_5, COST_190_25, "\"2026-06-30\"", "\"" + NOTES + "\"")))
                .andExpect(status().isUnsupportedMediaType());

        verifyNoInteractions(positionPort, portfolioPort, ledgerService);
    }

    @Test
    void shouldRejectUnsupportedContentTypeForUpdate() throws Exception {
        mockMvc.perform(put(BASE_PATH + "/42")
                        .contentType(MediaType.TEXT_PLAIN)
                        .content(validCreateBody("AAPL", QTY_10_5, COST_190_25, "\"2026-06-30\"", "\"" + NOTES + "\"")))
                .andExpect(status().isUnsupportedMediaType());

        verifyNoInteractions(positionPort, portfolioPort, ledgerService);
    }

    @Test
    void shouldReturn400ForEmptyJsonBodyOnCreate() throws Exception {
        mockMvc.perform(post(BASE_PATH)
                        .contentType(APPLICATION_JSON)
                        .accept(APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void shouldClarifyStableErrorShapeExpectationForAllExistingPortfolioPositionErrors() {
    }

    private PortfolioPosition position(Long id, String symbol, BigDecimal quantity, BigDecimal avgCost, LocalDate openedAt) {
        return new PortfolioPosition(
                id,
                DEFAULT_USER,
                symbol,
                quantity,
                avgCost,
                openedAt,
                NOTES,
                CREATED_AT,
                UPDATED_AT
        );
    }

    private Portfolio portfolio(Long id, String name, String baseCurrency, boolean isDefault) {
        return new Portfolio(id, DEFAULT_USER, name, baseCurrency, null, isDefault, CREATED_AT, UPDATED_AT);
    }

    private PortfolioTransaction transaction(
            Long id,
            Long portfolioId,
            String symbol,
            BigDecimal quantity,
            BigDecimal price,
            LocalDate tradeDate,
            String currency) {
        return new PortfolioTransaction(
                id,
                portfolioId,
                DEFAULT_USER,
                symbol,
                PortfolioAssetType.US_STOCK,
                PortfolioTransactionAction.BUY,
                quantity,
                price,
                currency,
                BigDecimal.ZERO,
                BigDecimal.ONE,
                tradeDate,
                PortfolioTransactionSource.MANUAL,
                NOTES,
                CREATED_AT,
                UPDATED_AT
        );
    }

    private String validCreateBody(
            String symbol,
            BigDecimal quantity,
            BigDecimal avgCostPrice,
            String openedAtLiteral,
            String notesLiteral
    ) {
        String symbolPart = symbol == null ? "null" : "\"" + symbol + "\"";
        String qtyPart = quantity == null ? "null" : quantity.stripTrailingZeros().toPlainString();
        String avgPart = avgCostPrice == null ? "null" : avgCostPrice.stripTrailingZeros().toPlainString();
        return """
                {
                  "symbol": %s,
                  "quantity": %s,
                  "avgCostPrice": %s,
                  "openedAt": %s,
                  "notes": %s
                }
                """.formatted(symbolPart, qtyPart, avgPart, openedAtLiteral, notesLiteral);
    }
}

