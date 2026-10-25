package com.ozkaslibasar.financeproject.domain.service;

import com.ozkaslibasar.financeproject.domain.model.PortfolioAssetType;
import com.ozkaslibasar.financeproject.domain.model.PortfolioTransaction;
import com.ozkaslibasar.financeproject.domain.model.PortfolioTransactionAction;
import com.ozkaslibasar.financeproject.domain.model.PortfolioTransactionSource;

import java.math.BigDecimal;
import java.nio.ByteBuffer;
import java.nio.charset.CharacterCodingException;
import java.nio.charset.CodingErrorAction;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * CSV schema v1 (decision D-4): UTF-8, comma separated, RFC 4180 quoting, header row first.
 *
 * <p>A file-level problem (size, rows, header, encoding, unterminated quote) throws
 * {@link IllegalArgumentException}. A row-level problem yields a {@link ParsedRow} with an error and no
 * transaction, so the row can be staged as INVALID. Nothing is defaulted except an empty {@code fee} (0), an empty
 * {@code fx_rate_to_base} (1), and what {@link PortfolioTransaction} itself defaults.</p>
 */
public final class PortfolioCsvParser {

    public static final int MAX_BYTES = 1_048_576;
    public static final int MAX_ROWS = 5_000;

    private static final List<String> REQUIRED = List.of("trade_date", "action", "symbol", "asset_type", "quantity",
            "price", "currency", "fee", "fx_rate_to_base");
    private static final Set<String> KNOWN = new HashSet<>(REQUIRED);
    private static final int MAX_NOTES = 1000;
    private static final int MAX_SYMBOL = 32;

    static {
        KNOWN.add("notes");
    }

    /** {@code rowNumber} counts non-blank data rows from 1; {@code transaction} and {@code locator} are null when invalid. */
    public record ParsedRow(int rowNumber, String rawLine, PortfolioTransaction transaction, String locator,
                            String error) {
    }

    private record CsvRecord(String raw, List<String> fields) {
    }

    public List<ParsedRow> parse(Long portfolioId, String userId, byte[] content) {
        if (content == null || content.length == 0) {
            throw new IllegalArgumentException("CSV file is empty");
        }
        if (content.length > MAX_BYTES) {
            throw new IllegalArgumentException("CSV file exceeds " + MAX_BYTES + " bytes");
        }
        List<CsvRecord> records = tokenize(decode(content));
        if (records.isEmpty()) {
            throw new IllegalArgumentException("CSV file is empty");
        }
        Map<String, Integer> columns = headerColumns(records.get(0).fields());
        if (records.size() == 1) {
            throw new IllegalArgumentException("CSV file has no data rows");
        }
        if (records.size() - 1 > MAX_ROWS) {
            throw new IllegalArgumentException("CSV file has more than " + MAX_ROWS + " data rows");
        }

        List<ParsedRow> rows = new ArrayList<>();
        Map<String, Integer> occurrences = new HashMap<>();
        int columnCount = records.get(0).fields().size();
        for (int i = 1; i < records.size(); i++) {
            CsvRecord record = records.get(i);
            int rowNumber = i;
            if (record.fields().size() != columnCount) {
                rows.add(invalid(rowNumber, record, "expected " + columnCount + " columns but found "
                        + record.fields().size()));
                continue;
            }
            try {
                PortfolioTransaction tx = toTransaction(portfolioId, userId, columns, record.fields());
                String base = baseLocator(tx);
                int occurrence = occurrences.merge(base, 1, Integer::sum);
                String locator = occurrence == 1 ? base : base + "#" + occurrence;
                rows.add(new ParsedRow(rowNumber, record.raw(), withLocator(tx, locator), locator, null));
            } catch (IllegalArgumentException e) {
                rows.add(invalid(rowNumber, record, e.getMessage()));
            }
        }
        return rows;
    }

    private static ParsedRow invalid(int rowNumber, CsvRecord record, String message) {
        return new ParsedRow(rowNumber, record.raw(), null, null, message);
    }

    private static String decode(byte[] content) {
        try {
            String text = StandardCharsets.UTF_8.newDecoder()
                    .onMalformedInput(CodingErrorAction.REPORT)
                    .onUnmappableCharacter(CodingErrorAction.REPORT)
                    .decode(ByteBuffer.wrap(content)).toString();
            return text.startsWith("﻿") ? text.substring(1) : text;
        } catch (CharacterCodingException e) {
            throw new IllegalArgumentException("CSV file is not valid UTF-8");
        }
    }

    /** RFC 4180 tokenizer; blank lines are skipped. A record may span lines only inside a quoted field. */
    private static List<CsvRecord> tokenize(String text) {
        List<CsvRecord> records = new ArrayList<>();
        List<String> fields = new ArrayList<>();
        StringBuilder field = new StringBuilder();
        boolean inQuotes = false;
        boolean afterClosingQuote = false;
        boolean fieldStarted = false;
        int recordStart = 0;
        int length = text.length();
        for (int i = 0; i < length; i++) {
            char c = text.charAt(i);
            if (inQuotes) {
                if (c == '"') {
                    if (i + 1 < length && text.charAt(i + 1) == '"') {
                        field.append('"');
                        i++;
                    } else {
                        inQuotes = false;
                        afterClosingQuote = true;
                    }
                } else {
                    field.append(c);
                }
                continue;
            }
            if (c == '\n' || (c == '\r' && i + 1 < length && text.charAt(i + 1) == '\n')) {
                int recordEnd = i;
                if (c == '\r') {
                    i++;
                }
                fields.add(field.toString());
                addRecord(records, fields, text.substring(recordStart, recordEnd));
                fields = new ArrayList<>();
                field = new StringBuilder();
                afterClosingQuote = false;
                fieldStarted = false;
                recordStart = i + 1;
            } else if (c == ',') {
                fields.add(field.toString());
                field = new StringBuilder();
                afterClosingQuote = false;
                fieldStarted = false;
            } else if (c == '"' && !fieldStarted && !afterClosingQuote && field.length() == 0) {
                inQuotes = true;
                fieldStarted = true;
            } else if (afterClosingQuote) {
                throw new IllegalArgumentException("unexpected character after closing quote near position " + i);
            } else {
                field.append(c);
                fieldStarted = true;
            }
        }
        if (inQuotes) {
            throw new IllegalArgumentException("unterminated quoted field (missing closing quote)");
        }
        if (recordStart < length) {
            fields.add(field.toString());
            addRecord(records, fields, text.substring(recordStart));
        }
        return records;
    }

    private static void addRecord(List<CsvRecord> records, List<String> fields, String raw) {
        if (raw.isBlank()) {
            return;
        }
        records.add(new CsvRecord(raw, fields));
    }

    private static Map<String, Integer> headerColumns(List<String> header) {
        Map<String, Integer> columns = new HashMap<>();
        for (int i = 0; i < header.size(); i++) {
            String name = header.get(i).trim().toLowerCase(Locale.ROOT);
            if (columns.put(name, i) != null) {
                throw new IllegalArgumentException("duplicate header: " + name);
            }
        }
        for (String name : columns.keySet()) {
            if (!KNOWN.contains(name)) {
                throw new IllegalArgumentException("unknown header: " + name);
            }
        }
        List<String> missing = REQUIRED.stream().filter(name -> !columns.containsKey(name)).toList();
        if (!missing.isEmpty()) {
            throw new IllegalArgumentException("missing required header(s): " + String.join(", ", missing));
        }
        return columns;
    }

    private static PortfolioTransaction toTransaction(Long portfolioId, String userId, Map<String, Integer> columns,
                                                      List<String> fields) {
        LocalDate tradeDate = parseDate(value(columns, fields, "trade_date"));
        PortfolioTransactionAction action = parseEnum(PortfolioTransactionAction.class, "action",
                value(columns, fields, "action"));
        PortfolioAssetType assetType = parseEnum(PortfolioAssetType.class, "asset_type",
                value(columns, fields, "asset_type"));
        String currency = value(columns, fields, "currency");
        if (currency.isEmpty()) {
            throw new IllegalArgumentException("currency is required");
        }
        String symbol = value(columns, fields, "symbol");
        if (symbol.length() > MAX_SYMBOL) {
            throw new IllegalArgumentException("symbol must be at most " + MAX_SYMBOL + " characters");
        }
        BigDecimal quantity = parseNumber("quantity", value(columns, fields, "quantity"), null, 16, 8);
        BigDecimal price = parseNumber("price", value(columns, fields, "price"), null, 16, 8);
        BigDecimal fee = parseNumber("fee", value(columns, fields, "fee"), BigDecimal.ZERO, 16, 8);
        BigDecimal fx = parseNumber("fx_rate_to_base", value(columns, fields, "fx_rate_to_base"), BigDecimal.ONE, 14, 10);
        String notes = columns.containsKey("notes") ? value(columns, fields, "notes") : "";
        if (notes.length() > MAX_NOTES) {
            throw new IllegalArgumentException("notes must be at most " + MAX_NOTES + " characters");
        }
        return new PortfolioTransaction(null, portfolioId, userId, symbol.isEmpty() ? null : symbol, assetType, action,
                quantity, price, currency, fee, fx, tradeDate, PortfolioTransactionSource.CSV,
                notes.isEmpty() ? null : notes, null, null, null, null);
    }

    private static String value(Map<String, Integer> columns, List<String> fields, String name) {
        return fields.get(columns.get(name)).trim();
    }

    private static LocalDate parseDate(String raw) {
        if (raw.isEmpty()) {
            throw new IllegalArgumentException("trade_date is required");
        }
        try {
            return LocalDate.parse(raw);
        } catch (DateTimeParseException e) {
            throw new IllegalArgumentException("trade_date must be yyyy-MM-dd: " + raw);
        }
    }

    private static <E extends Enum<E>> E parseEnum(Class<E> type, String column, String raw) {
        if (raw.isEmpty()) {
            throw new IllegalArgumentException(column + " is required");
        }
        try {
            return Enum.valueOf(type, raw.toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException(column + " is not supported: " + raw);
        }
    }

    /** Empty becomes {@code whenEmpty}; a value that does not fit the column's NUMERIC precision is rejected. */
    private static BigDecimal parseNumber(String column, String raw, BigDecimal whenEmpty, int integerDigits, int scale) {
        if (raw.isEmpty()) {
            return whenEmpty;
        }
        BigDecimal number;
        try {
            number = new BigDecimal(raw);
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException(column + " is not a number: " + raw);
        }
        BigDecimal stripped = number.compareTo(BigDecimal.ZERO) == 0 ? BigDecimal.ZERO : number.stripTrailingZeros();
        if (stripped.scale() > scale || stripped.precision() - stripped.scale() > integerDigits) {
            throw new IllegalArgumentException(column + " has too many digits: " + raw);
        }
        return number;
    }

    private static String baseLocator(PortfolioTransaction tx) {
        // R-10: the identity also covers the portfolio and user, because (source, origin_locator) is unique globally.
        String normalized = String.join("\u001f",
                String.valueOf(tx.portfolioId()),
                tx.userId(),
                tx.tradeDate().toString(),
                tx.action().name(),
                tx.symbol() == null ? "" : tx.symbol(),
                tx.assetType().name(),
                plain(tx.quantity()),
                plain(tx.price()),
                tx.currency(),
                plain(tx.fee()),
                plain(tx.fxRateToBase()));
        return "csv:" + sha256Hex(normalized);
    }

    private static String plain(BigDecimal value) {
        return value.compareTo(BigDecimal.ZERO) == 0 ? "0" : value.stripTrailingZeros().toPlainString();
    }

    private static String sha256Hex(String text) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(text.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder(digest.length * 2);
            for (byte b : digest) {
                hex.append(String.format("%02x", b));
            }
            return hex.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is unavailable", e);
        }
    }

    private static PortfolioTransaction withLocator(PortfolioTransaction t, String locator) {
        return new PortfolioTransaction(null, t.portfolioId(), t.userId(), t.symbol(), t.assetType(), t.action(),
                t.quantity(), t.price(), t.currency(), t.fee(), t.fxRateToBase(), t.tradeDate(), t.source(), t.notes(),
                null, null, locator, null);
    }
}
