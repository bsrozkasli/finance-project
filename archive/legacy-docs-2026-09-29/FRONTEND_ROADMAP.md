# Institutional Investment Analytics Platform

## Frontend Implementation Roadmap

## Objective

Build an institutional-grade investment analytics platform for personal portfolio management.

This application is **not** a retail investing dashboard.

The goal is to create a professional research and portfolio management platform inspired by:

* Bloomberg Terminal
* TradingView
* Koyfin
* TIKR
* Portfolio Visualizer
* Finviz Elite

The connected Google Stitch project is the **single source of truth** for every UI decision.

---

# Development Rules

## Before writing code

1. Read the active Google Stitch project.
2. Read every available screen.
3. Read the Design System.
4. Read design tokens.
5. Analyze the existing frontend.
6. Compare the current implementation with the Stitch design.
7. Create an implementation plan.
8. Only then start modifying code.

Never redesign the UI yourself if Stitch already defines it.

---

# Engineering Standards

* Keep existing backend APIs unchanged.
* Preserve business logic.
* Build reusable components.
* Avoid duplicated code.
* Responsive by default.
* Accessibility first.
* Modern animations.
* Type-safe components.
* Production-ready architecture.

Always verify:

* Build
* Lint
* Types
* Existing functionality

after every major implementation.

---

# Application Architecture

The platform consists of six primary modules.

---

# 1. Dashboard

Purpose:

Provide an instant overview of my investment portfolio.

Sections:

## Portfolio Overview

Display:

* Portfolio Value
* Cash
* Daily Profit/Loss
* Total Profit/Loss
* Portfolio Return
* Portfolio Performance

---

## Holdings

Professional table including:

* Company
* Ticker
* Shares
* Average Cost
* Current Price
* Market Value
* Daily Change
* Total Return
* Unrealized P/L

Features:

* Sorting
* Filtering
* Search

---

## Allocation

Charts:

* Asset Allocation
* Sector Allocation
* Industry Allocation
* Country Allocation
* Theme Allocation

---

## News Sidebar

A permanent left sidebar.

Shows:

* Portfolio news
* Holdings news
* Watchlist news
* Macro news
* Central Bank news
* Earnings
* Dividends
* Geopolitical events

The sidebar must be collapsible.

---

# 2. Workspace

This is the core of the application.

It should feel similar to TradingView.

## Chart

Large interactive chart supporting:

* Candlestick
* Line
* Area

Drawing tools:

* Trend Lines
* Horizontal Lines
* Vertical Lines
* Fibonacci
* Channels
* Rectangles
* Notes
* Text
* Measurement Tool

Indicators:

* RSI
* MACD
* EMA
* SMA
* Bollinger Bands
* Volume

---

## Watchlist Panel

Collapsible.

Resizable.

Selecting a stock automatically updates every widget.

---

## Company Information

Display:

* Overview
* Key Metrics
* Financial Ratios
* Revenue
* Earnings
* Free Cash Flow
* Margins
* Valuation Multiples
* Analyst Ratings
* AI Summary

---

# 3. Portfolio

Dedicated portfolio analytics page.

Include:

## Holdings Table

Professional data grid.

Columns:

* Company
* Ticker
* Shares
* Average Cost
* Current Price
* Cost Basis
* Market Value
* Allocation
* Daily Return
* Total Return
* Unrealized P/L

---

## Portfolio Analytics

Charts:

* Allocation
* Performance
* Risk
* Drawdown
* Benchmark Comparison

Supported periods:

* 1D
* 5D
* 1M
* 3M
* 6M
* YTD
* 1Y
* 3Y
* 5Y
* MAX

---

# 4. Trading Journal

This page manages every executed trade.

Floating Action Button:

"Add Trade"

Opening it displays a modern modal.

Fields:

* Company
* Ticker
* Buy / Sell
* Quantity
* Average Cost
* Purchase Price
* Purchase Date
* Current Price
* Commission
* Strategy
* Notes
* Tags

Journal Table:

* Company
* Ticker
* Quantity
* Buy Price
* Current Price
* Market Value
* Profit/Loss
* Return %
* Holding Period
* Status
* Notes

Features:

* Edit
* Delete
* Search
* Filters
* Sorting

---

# 5. Watchlist

Acts as a research center.

Each company includes:

* Overview
* Price
* Financial Statements
* Valuation
* Technical Analysis
* Analyst Ratings
* Earnings
* Insider Activity
* Institutional Ownership
* News
* AI Summary

Support multiple watchlists.

---

# 6. News Center

Acts as a market intelligence hub.

Categories:

* Breaking News
* Portfolio
* Watchlist
* Economy
* Inflation
* Interest Rates
* Central Banks
* AI
* Technology
* Defense
* Energy
* Healthcare

Support:

* Timeline
* Search
* Filters
* Priority Labels

---

# 7. AI Reports

This is the flagship feature.

Generate institutional-quality reports.

Each report should contain:

* Executive Summary
* Company Overview
* Business Model
* Financial Health
* Revenue Analysis
* Profitability
* Cash Flow
* Valuation
* Competitive Landscape
* Industry Analysis
* Macro Analysis
* Technical Analysis
* Risk Assessment
* Catalysts
* Bull Case
* Base Case
* Bear Case
* Fair Value
* Price Targets
* AI Investment Thesis

Reports should be:

* Exportable
* Regeneratable
* Comparable
* Saveable

---

# UI Goals

The entire application should feel like software used by institutional investors.

Design principles:

* Premium
* Minimal
* Information Dense
* Fast
* Professional
* Modern
* Consistent
* Highly Readable

Avoid consumer-finance aesthetics.

Aim for Bloomberg Terminal data density combined with TradingView usability and modern UI quality.

---

# Expected Workflow

For every task:

1. Read Stitch.
2. Compare with current frontend.
3. Explain the implementation plan.
4. Implement incrementally.
5. Validate build.
6. Validate UI consistency.
7. Continue until the entire roadmap is completed.
