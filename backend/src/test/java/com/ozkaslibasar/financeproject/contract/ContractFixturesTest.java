package com.ozkaslibasar.financeproject.contract;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ContractFixturesTest {

    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void collectsNestedObjectAndArrayFieldPaths() throws Exception {
        var node = mapper.readTree("""
                {"period":"1M","series":[{"date":"d","value":1}],"metrics":{"sharpe":null}}
                """);

        assertThat(ContractFixtures.shapeOf(node)).containsExactly(
                "$.metrics",
                "$.metrics.sharpe",
                "$.period",
                "$.series",
                "$.series[].date",
                "$.series[].value");
    }

    @Test
    void distinguishesRenamedFields() throws Exception {
        var backend = mapper.readTree("{\"totalPnL\":1}");
        var renamed = mapper.readTree("{\"totalPnl\":1}");

        assertThat(ContractFixtures.shapeOf(backend)).isNotEqualTo(ContractFixtures.shapeOf(renamed));
    }

    @Test
    void ignoresValuesAndTreatsNullAsLeaf() throws Exception {
        var populated = mapper.readTree("{\"sharpe\":1.5,\"maxDrawdown\":-3.2}");
        var empty = mapper.readTree("{\"sharpe\":null,\"maxDrawdown\":null}");

        assertThat(ContractFixtures.shapeOf(populated)).isEqualTo(ContractFixtures.shapeOf(empty));
    }
}
