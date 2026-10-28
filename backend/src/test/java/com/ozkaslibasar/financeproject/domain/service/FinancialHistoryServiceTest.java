package com.ozkaslibasar.financeproject.domain.service;

import com.ozkaslibasar.financeproject.domain.model.FinancialHistory;
import com.ozkaslibasar.financeproject.domain.model.FinancialHistoryPoint;
import com.ozkaslibasar.financeproject.domain.model.FinancialHistorySnapshot;
import com.ozkaslibasar.financeproject.domain.model.FinancialHistoryStatus;
import com.ozkaslibasar.financeproject.domain.model.FinancialYearRaw;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class FinancialHistoryServiceTest {

    private static BigDecimal bd(String v) {
        return v == null ? null : new BigDecimal(v);
    }

    private static FinancialYearRaw year(int y, String revenue, String netIncome, String ocf, String capex,
                                         String assets, String equity, String debt, String cash,
                                         String ca, String cl) {
        return new FinancialYearRaw(y, LocalDate.of(y, 12, 31), bd(revenue), bd(netIncome), bd(ocf), bd(capex),
                bd(assets), null, bd(equity), bd(debt), bd(cash), bd(ca), bd(cl));
    }

    private static FinancialYearRaw empty(int y) {
        return year(y, null, null, null, null, null, null, null, null, null, null);
    }

    private static FinancialHistory derive(FinancialYearRaw... years) {
        return FinancialHistoryService.derive(new FinancialHistorySnapshot(
                "AAPL", FinancialHistoryStatus.AVAILABLE, "USD", Instant.parse("2026-01-01T00:00:00Z"),
                List.of(years)));
    }

    private static FinancialHistoryPoint last(FinancialHistory h) {
        return h.points().get(h.points().size() - 1);
    }

    @Test
    void debtToEquity_isDebtOverEquity() {
        FinancialHistoryPoint p = last(derive(year(2023, null, null, null, null, null, "100", "150", null, null, null)));
        assertThat(p.debtToEquity()).isEqualByComparingTo("1.5");
    }

    @Test
    void negativeEquity_makesDebtToEquityAndRoeNotMeaningful() {
        FinancialHistoryPoint p = last(derive(year(2023, null, "25", null, null, null, "-10", "150", null, null, null)));
        assertThat(p.debtToEquity()).isNull();
        assertThat(p.roe()).isNull();
        assertThat(p.notMeaningful()).contains("debtToEquity", "roe");
    }

    @Test
    void missingDebt_isNullAndNotListedAsNotMeaningful() {
        FinancialHistoryPoint p = last(derive(year(2023, null, null, null, null, null, "100", null, null, null, null)));
        assertThat(p.debtToEquity()).isNull();
        assertThat(p.notMeaningful()).isEmpty();
    }

    @Test
    void currentRatio_isCurrentAssetsOverCurrentLiabilities() {
        FinancialHistoryPoint p = last(derive(year(2023, null, null, null, null, null, null, null, null, "200", "100")));
        assertThat(p.currentRatio()).isEqualByComparingTo("2");

        FinancialHistoryPoint zero = last(derive(year(2023, null, null, null, null, null, null, null, null, "200", "0")));
        assertThat(zero.currentRatio()).isNull();
        assertThat(zero.notMeaningful()).contains("currentRatio");
    }

    @Test
    void roeRoaNetMargin() {
        FinancialHistoryPoint p = last(derive(year(2023, "250", "25", null, null, "500", "100", null, null, null, null)));
        assertThat(p.roe()).isEqualByComparingTo("0.25");
        assertThat(p.roa()).isEqualByComparingTo("0.05");
        assertThat(p.netMargin()).isEqualByComparingTo("0.1");
    }

    @Test
    void freeCashFlow_isOperatingMinusCapex() {
        FinancialHistoryPoint p = last(derive(year(2023, "500", null, "120", "20", null, null, null, null, null, null)));
        assertThat(p.freeCashFlow()).isEqualByComparingTo("100");
        assertThat(p.fcfMargin()).isEqualByComparingTo("0.2");

        FinancialHistoryPoint noCapex = last(derive(year(2023, "500", null, "120", null, null, null, null, null, null, null)));
        assertThat(noCapex.freeCashFlow()).isNull();
        assertThat(noCapex.fcfMargin()).isNull();
        assertThat(noCapex.notMeaningful()).isEmpty();
    }

    @Test
    void netDebt_isDebtMinusCash() {
        FinancialHistoryPoint p = last(derive(year(2023, null, null, null, null, null, null, "150", "40", null, null)));
        assertThat(p.netDebt()).isEqualByComparingTo("110");
    }

    @Test
    void growth_usesPreviousConsecutiveYear() {
        FinancialHistory h = derive(
                year(2022, "100", "10", null, null, null, null, null, null, null, null),
                year(2023, "120", "15", null, null, null, null, null, null, null, null));
        assertThat(h.points().get(0).revenueGrowth()).isNull();
        assertThat(h.points().get(1).revenueGrowth()).isEqualByComparingTo("0.2");
        assertThat(h.points().get(1).netIncomeGrowth()).isEqualByComparingTo("0.5");
    }

    @Test
    void growth_skipsGapYear() {
        FinancialHistory h = derive(
                year(2021, "100", "10", null, null, null, null, null, null, null, null),
                year(2023, "120", "15", null, null, null, null, null, null, null, null));
        FinancialHistoryPoint p = h.points().get(1);
        assertThat(p.revenueGrowth()).isNull();
        assertThat(p.netIncomeGrowth()).isNull();
        assertThat(p.notMeaningful()).isEmpty();
    }

    @Test
    void growth_nonPositivePrevious_isNotMeaningful() {
        FinancialHistory h = derive(
                year(2022, "0", "-5", null, null, null, null, null, null, null, null),
                year(2023, "120", "15", null, null, null, null, null, null, null, null));
        FinancialHistoryPoint p = h.points().get(1);
        assertThat(p.revenueGrowth()).isNull();
        assertThat(p.netIncomeGrowth()).isNull();
        assertThat(p.notMeaningful()).contains("revenueGrowth", "netIncomeGrowth");
    }

    @Test
    void ratiosAreRoundedToSixPlaces() {
        FinancialHistoryPoint p = last(derive(year(2023, null, null, null, null, null, "3", "1", null, null, null)));
        assertThat(p.debtToEquity()).isEqualByComparingTo("0.333333");
    }

    @Test
    void unavailableSnapshot_yieldsNoPoints() {
        FinancialHistory h = FinancialHistoryService.derive(new FinancialHistorySnapshot(
                "AAPL", FinancialHistoryStatus.UNAVAILABLE, null, null, List.of()));
        assertThat(h.points()).isEmpty();
        assertThat(h.status()).isEqualTo(FinancialHistoryStatus.UNAVAILABLE);
    }

    @Test
    void statusAndCurrencyPassThrough() {
        FinancialHistoryService service = new FinancialHistoryService(symbol -> new FinancialHistorySnapshot(
                symbol, FinancialHistoryStatus.PARTIAL, "EUR", Instant.parse("2026-02-02T00:00:00Z"),
                List.of(empty(2023))));
        FinancialHistory h = service.getHistory("SAP");
        assertThat(h.symbol()).isEqualTo("SAP");
        assertThat(h.status()).isEqualTo(FinancialHistoryStatus.PARTIAL);
        assertThat(h.currency()).isEqualTo("EUR");
        assertThat(h.retrievedAt()).isEqualTo(Instant.parse("2026-02-02T00:00:00Z"));
        assertThat(h.points()).hasSize(1);
    }

    @Test
    void pointsStayAscending() {
        FinancialHistory h = derive(empty(2021), empty(2022), empty(2023));
        assertThat(h.points()).extracting(FinancialHistoryPoint::fiscalYear).containsExactly(2021, 2022, 2023);
    }

    @Test
    void unavailableSnapshotWithYears_stillYieldsNoPoints() {
        FinancialHistory h = FinancialHistoryService.derive(new FinancialHistorySnapshot(
                "AAPL", FinancialHistoryStatus.UNAVAILABLE, null, null,
                List.of(empty(2022), empty(2023))));
        assertThat(h.status()).isEqualTo(FinancialHistoryStatus.UNAVAILABLE);
        assertThat(h.points()).isEmpty();
    }

    @Test
    void fiscalYearOf_followsFiftyTwoFiftyThreeWeekConvention() {
        assertThat(FinancialYearRaw.fiscalYearOf(LocalDate.of(2022, 1, 2))).isEqualTo(2021);
        assertThat(FinancialYearRaw.fiscalYearOf(LocalDate.of(2023, 1, 1))).isEqualTo(2022);
        assertThat(FinancialYearRaw.fiscalYearOf(LocalDate.of(2023, 1, 7))).isEqualTo(2022);
        assertThat(FinancialYearRaw.fiscalYearOf(LocalDate.of(2023, 1, 8))).isEqualTo(2023);
        assertThat(FinancialYearRaw.fiscalYearOf(LocalDate.of(2023, 12, 31))).isEqualTo(2023);
        assertThat(FinancialYearRaw.fiscalYearOf(LocalDate.of(2024, 2, 3))).isEqualTo(2024);
    }

    @Test
    void dpzStylePair_growthComputedForRealFy2023AgainstFy2022() {
        FinancialYearRaw fy2022 = new FinancialYearRaw(FinancialYearRaw.fiscalYearOf(LocalDate.of(2023, 1, 1)),
                LocalDate.of(2023, 1, 1), bd("100"), bd("10"), null, null, null, null, null, null, null, null, null);
        FinancialYearRaw fy2023 = new FinancialYearRaw(FinancialYearRaw.fiscalYearOf(LocalDate.of(2023, 12, 31)),
                LocalDate.of(2023, 12, 31), bd("150"), bd("20"), null, null, null, null, null, null, null, null, null);
        FinancialHistory h = derive(fy2022, fy2023);
        assertThat(h.points()).extracting(FinancialHistoryPoint::fiscalYear).containsExactly(2022, 2023);
        assertThat(last(h).revenueGrowth()).isEqualByComparingTo("0.5");
        assertThat(last(h).netIncomeGrowth()).isEqualByComparingTo("1");
    }
}
