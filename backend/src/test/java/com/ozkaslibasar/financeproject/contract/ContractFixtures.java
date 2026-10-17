package com.ozkaslibasar.financeproject.contract;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Iterator;
import java.util.Map;
import java.util.SortedSet;
import java.util.TreeSet;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Shared HTTP contract fixtures in docs/contracts/fixtures. Backend tests pin the
 * serialized field shape; frontend tests parse the same files with a hand-mirrored zod
 * schema. This detects fixture/backend drift and fixture/frontend-schema drift; the
 * schema must be kept in sync with {@code client.ts} by hand.
 */
public final class ContractFixtures {

    private static final ObjectMapper MAPPER = new ObjectMapper();
    // Maven runs tests with backend/ as the working directory.
    private static final Path FIXTURE_DIR = Path.of("..", "docs", "contracts", "fixtures");

    private ContractFixtures() {
    }

    public static void assertSameShape(String fixtureName, String actualJson) throws IOException {
        JsonNode fixture = MAPPER.readTree(Files.readString(FIXTURE_DIR.resolve(fixtureName)));
        JsonNode actual = MAPPER.readTree(actualJson);
        assertThat(shapeOf(actual))
                .as("Serialized response shape must match docs/contracts/fixtures/%s", fixtureName)
                .isEqualTo(shapeOf(fixture));
    }

    static SortedSet<String> shapeOf(JsonNode node) {
        SortedSet<String> paths = new TreeSet<>();
        collect(node, "$", paths);
        return paths;
    }

    private static void collect(JsonNode node, String path, SortedSet<String> paths) {
        if (node.isObject()) {
            Iterator<Map.Entry<String, JsonNode>> fields = node.fields();
            while (fields.hasNext()) {
                Map.Entry<String, JsonNode> field = fields.next();
                String childPath = path + "." + field.getKey();
                paths.add(childPath);
                collect(field.getValue(), childPath, paths);
            }
        } else if (node.isArray()) {
            for (JsonNode element : node) {
                collect(element, path + "[]", paths);
            }
        }
    }
}
