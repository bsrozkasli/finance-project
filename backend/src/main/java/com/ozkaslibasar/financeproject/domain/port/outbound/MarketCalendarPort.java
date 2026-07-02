package com.ozkaslibasar.financeproject.domain.port.outbound;

import com.ozkaslibasar.financeproject.domain.model.EarningsEvent;
import com.ozkaslibasar.financeproject.domain.model.EconomicEvent;
import com.ozkaslibasar.financeproject.domain.model.MacroSnapshot;
import com.ozkaslibasar.financeproject.domain.model.MarketCalendar;

import java.util.List;
import java.util.Optional;

/** Outbound port for macro and market calendar data served by the data-service. */
public interface MarketCalendarPort {

    Optional<MacroSnapshot> fetchMacroSnapshot();

    MarketCalendar fetchMarketCalendar(List<String> symbols);

    List<EarningsEvent> fetchEarnings(List<String> symbols);

    List<EconomicEvent> fetchEconomicEvents();
}