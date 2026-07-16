package com.ozkaslibasar.financeproject.domain.port.outbound;

import com.ozkaslibasar.financeproject.domain.model.SymbolMapping;

import java.util.Optional;

public interface SymbolMappingPort {

    Optional<SymbolMapping> findBestMapping(String canonicalSymbol, String provider);
}
