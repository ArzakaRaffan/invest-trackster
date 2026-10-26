"""Research prototype for candidate methodology v0.1; not production investment logic.

Run: python docs/invest/research/method_checks.py
Optional public historical exploration: add --history
No credentials, private data, or raw market series are written. Results go to stdout.
"""

import calendar
import hashlib
import itertools
import json
import math
import statistics
import sys
import urllib.parse
import urllib.request
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal, ROUND_HALF_UP


VERSION = "invest-method-v0.1"
WIB = timezone(timedelta(hours=7))
ASSETS = ("cash", "bonds", "equity", "crypto")
TEMPLATES = (
    (1.0, 0.0, 0.0, 0.0),
    (0.60, 0.30, 0.10, 0.0),
    (0.30, 0.40, 0.30, 0.0),
    (0.10, 0.30, 0.60, 0.0),
)
# Product hypotheses, not estimated probabilities or worst-case loss bounds.
SHOCKS = {
    "market": (0.0, -0.15, -0.50, -1.0),
    "rates": (0.0, -0.20, -0.20, -0.70),
    "market_and_fx": (0.0, -0.15, -0.60, -1.0),
}
CHECKS = {}


def verify(group, condition):
    if not condition:
        raise AssertionError(group)
    CHECKS[group] = CHECKS.get(group, 0) + 1


def quota(income):
    income = Decimal(str(income))
    if not income.is_finite() or income < 0:
        raise ValueError("income must be finite and nonnegative")
    return (income / 5).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def payment_dates(year, month, cadence, payday):
    days = calendar.monthrange(year, month)[1]
    if cadence == "MONTHLY":
        if not isinstance(payday, int) or not 1 <= payday <= 31:
            raise ValueError("monthly payday required")
        return [date(year, month, min(payday, days))]
    if cadence == "WEEKLY":
        if not isinstance(payday, int) or not 0 <= payday <= 6:
            raise ValueError("weekly payday required; 0=Sunday")
        return [date(year, month, day) for day in range(1, days + 1)
                if (date(year, month, day).weekday() + 1) % 7 == payday]
    if cadence == "NONE":
        return []
    raise ValueError("unknown cadence")


def monthly_totals(rows, events, year, month):
    """Rows/events are synthetic; IDs link confirmations to scheduled events."""
    received = [row for row in rows if row["status"] == "CONFIRMED"
                and datetime.fromisoformat(row["receivedAt"]).astimezone(WIB).date().year == year
                and datetime.fromisoformat(row["receivedAt"]).astimezone(WIB).date().month == month]
    actual = sum((Decimal(str(row["amount"])) for row in received), Decimal(0))
    confirmed_by_event = {}
    for row in rows:
        if row["status"] == "CONFIRMED" and row.get("eventId"):
            key = row["eventId"]
            confirmed_by_event[key] = confirmed_by_event.get(key, Decimal(0)) + Decimal(str(row["amount"]))
    remaining = Decimal(0)
    for event in events:
        if event["date"].year == year and event["date"].month == month:
            if event.get("completed"):
                continue
            remaining += max(Decimal(0), Decimal(str(event["expected"]))
                             - confirmed_by_event.get(event["id"], Decimal(0)))
    return actual, actual + remaining


def profile(answers, reserve_months, stable_income, horizon_months, blocked=False):
    if len(answers) != 4 or any(type(a) is not int or not 0 <= a <= 3 for a in answers):
        raise ValueError("four complete answers required")
    if not math.isfinite(reserve_months) or reserve_months < 0 or horizon_months < 0:
        raise ValueError("invalid capacity or horizon")
    total = sum(answers)
    tolerance = 0 if total <= 2 else 1 if total <= 5 else 2 if total <= 8 else 3
    tolerance = min(tolerance, answers[0])  # stated loss ceiling cannot be averaged away
    capacity = 0 if reserve_months < 3 or blocked else 1 if reserve_months < 6 else 3 if stable_income else 2
    horizon = 0 if horizon_months < 36 else 1 if horizon_months < 60 else 2 if horizon_months < 120 else 3
    return min(tolerance, capacity, horizon)


def stress_loss(weights, shock):
    return max(0.0, -sum(w * r for w, r in zip(weights, shock)))


def allocation(level, loss_limit, crypto=0.0):
    if type(level) is not int or not 0 <= level <= 3 or not 0 <= loss_limit <= 1:
        raise ValueError("invalid profile or loss limit")
    if not 0 <= crypto <= 0.05 or (crypto > 0 and level != 3):
        raise ValueError("crypto opt-in limited to growth profile")
    weights = list(TEMPLATES[level])
    weights[2] -= crypto
    weights[3] = crypto
    maximum = max(stress_loss(weights, shock) for shock in SHOCKS.values())
    scale = min(1.0, loss_limit / maximum) if maximum else 1.0
    weights[1:] = [weight * scale for weight in weights[1:]]
    weights[0] = 1 - sum(weights[1:])
    return weights


def split_minor_units(amount, weights):
    """Largest remainder, stable asset order on ties. amount is integer sen."""
    if type(amount) is not int or amount < 0 or len(weights) != 4:
        raise ValueError("invalid amount or dimensions")
    decimals = [Decimal(str(weight)) for weight in weights]
    if any(not weight.is_finite() or weight < 0 for weight in decimals):
        raise ValueError("invalid weights")
    total = sum(decimals)
    if abs(total - 1) > Decimal("0.000000001"):
        raise ValueError("weights must sum to one")
    exact = [Decimal(amount) * weight / total for weight in decimals]
    parts = [int(value) for value in exact]
    order = sorted(range(4), key=lambda i: (-(exact[i] - parts[i]), i))
    for i in order[:amount - sum(parts)]:
        parts[i] += 1
    return parts


def contribution(current, cash, target, loss_limit=None):
    """Non-cash positive deficits only; surplus contribution stays in cash."""
    total = sum(current) + cash
    deficits = [max(0.0, total * target[i] - current[i]) for i in range(1, 4)]
    need = sum(deficits)
    factor = min(1.0, cash / need) if need else 0.0
    additions = [value * factor for value in deficits]
    result = [cash - sum(additions)] + additions
    if loss_limit is not None and total:
        proposed_weights = [(before + added) / total for before, added in zip(current, result)]
        if max(stress_loss(proposed_weights, shock) for shock in SHOCKS.values()) > loss_limit + 1e-12:
            return [cash, 0.0, 0.0, 0.0]
    return result


def rank(candidates, cap=0.03):
    scored = []
    for item in candidates:
        if not item["eligible"] or item["cost"] is None:
            continue
        if not math.isfinite(item["cost"]) or item["cost"] < 0:
            raise ValueError("invalid annualized cost")
        values = [item[k] for k in ("diversification", "data", "liquidity", "access")]
        if any(type(value) not in (int, float) or not math.isfinite(value) or not 0 <= value <= 100 for value in values):
            raise ValueError("invalid feature")
        cost_score = max(0.0, 100 * (1 - item["cost"] / cap))
        score = cost_score * .30 + values[0] * .20 + values[1] * .20 + values[2] * .15 + values[3] * .15
        scored.append({"id": item["id"], "score": score, "cost": item["cost"], "asOf": item["asOf"]})
    return sorted(scored, key=lambda x: (-round(x["score"], 6), x["cost"], -x["asOf"], x["id"]))[:3]


def spend_plan(budget, unit_price, lot, fee_rate, fixed_fee=0):
    """Integer sen throughout; fee rounded up to avoid overspending."""
    if budget < 0 or unit_price <= 0 or lot <= 0 or not 0 <= fee_rate < 1 or fixed_fee < 0:
        raise ValueError("invalid order parameters")
    lot_price = unit_price * lot
    lots = max(0, int((budget - fixed_fee) / (lot_price * (1 + fee_rate))))
    while lots:
        principal = lot_price * lots
        fee = math.ceil(principal * fee_rate) + fixed_fee
        if principal + fee <= budget:
            return principal, fee, budget - principal - fee
        lots -= 1
    return 0, 0, budget  # no attempted purchase means no transaction fee


def validate_ai_fields(payload, reference):
    """Only structured invariant validation; does not validate free-text claims."""
    return payload.get("amounts") == reference["amounts"] and payload.get("ranking") == reference["ranking"] \
        and set(payload.get("sources", [])) <= set(reference["sources"])


def synthetic_checks():
    verify("monthly", len(payment_dates(2026, 10, "WEEKLY", 5)) == 5)
    verify("monthly", len(payment_dates(2026, 2, "WEEKLY", 5)) == 4)
    verify("monthly", payment_dates(2028, 2, "MONTHLY", 31) == [date(2028, 2, 29)])
    verify("monthly", payment_dates(2026, 2, "MONTHLY", 31) == [date(2026, 2, 28)])
    rows = [
        {"amount": 300, "status": "CONFIRMED", "receivedAt": "2026-09-30T17:00:00+00:00", "eventId": "oct-pay"},
        {"amount": 100, "status": "CONFIRMED", "receivedAt": "2026-10-12T12:00:00+07:00"},
        {"amount": 900, "status": "INTERNAL", "receivedAt": "2026-10-12T12:00:00+07:00"},
        {"amount": 700, "status": "PENDING", "receivedAt": "2026-10-12T12:00:00+07:00"},
        {"amount": 200, "status": "CONFIRMED", "receivedAt": "2026-09-30T16:59:59+00:00"},
        {"amount": 800, "status": "CONFIRMED", "receivedAt": "2026-10-31T17:00:00+00:00"},
    ]
    events = [{"id": "oct-pay", "date": date(2026, 10, 1), "expected": 500}]
    actual, forecast = monthly_totals(rows, events, 2026, 10)
    verify("monthly", (actual, forecast) == (Decimal(400), Decimal(600)))
    verify("monthly", (quota(actual), quota(forecast)) == (Decimal(80), Decimal(120)))
    verify("monthly", monthly_totals(rows, [dict(events[0], completed=True)], 2026, 10) == (Decimal(400), Decimal(400)))
    for value, expected in (("0", "0.00"), ("100001", "20000.20"), ("0.03", "0.01")):
        verify("rounding", quota(value) == Decimal(expected))
    for amount in range(0, 1001):
        for weights in TEMPLATES:
            parts = split_minor_units(amount, weights)
            verify("rounding", sum(parts) == amount and all(part >= 0 for part in parts))
    profiles = {}
    for answers in itertools.product(range(4), repeat=4):
        for reserve, stable, horizon in itertools.product((0, 3, 6), (False, True), (12, 36, 60, 120)):
            level = profile(answers, reserve, stable, horizon)
            profiles[level] = profiles.get(level, 0) + 1
            verify("risk", level <= answers[0])
            verify("risk", reserve >= 3 or level == 0)
            verify("risk", horizon >= 36 or level == 0)
            verify("risk", profile(answers, reserve, stable, horizon, True) == 0)
            for i in range(4):
                if answers[i] < 3:
                    higher = list(answers)
                    higher[i] += 1
                    verify("risk_monotonicity", profile(higher, reserve, stable, horizon) >= level)
    stress = {}
    for level, loss_limit in enumerate((0, .10, .20, .35)):
        weights = allocation(level, loss_limit)
        losses = {name: stress_loss(weights, shock) for name, shock in SHOCKS.items()}
        verify("allocation", abs(sum(weights) - 1) < 1e-12 and min(weights) >= 0)
        verify("allocation", max(losses.values()) <= loss_limit + 1e-12)
        stress[str(level)] = {"base": list(TEMPLATES[level]), "adjusted": weights, "losses": losses}
    crypto_weights = allocation(3, .35, .05)
    verify("allocation", crypto_weights[3] <= .05 and max(stress_loss(crypto_weights, shock) for shock in SHOCKS.values()) <= .35 + 1e-12)
    verify("allocation", allocation(3, 0) == [1.0, 0.0, 0.0, 0.0])
    limited = allocation(3, .05)
    verify("allocation", max(stress_loss(limited, shock) for shock in SHOCKS.values()) <= .05 + 1e-12)
    for values in ((900, 0, 100, 0), (0, 100, 900, 0), (0, 0, 0, 0), (250, 250, 250, 250)):
        added = contribution(values, 200, TEMPLATES[2])
        verify("contribution", abs(sum(added) - 200) < 1e-9 and min(added) >= 0)
        for i in range(1, 4):
            verify("contribution", values[i] < (sum(values) + 200) * TEMPLATES[2][i] or added[i] == 0)
    verify("contribution", contribution((0, 0, 1000, 0), 100, TEMPLATES[2], .20) == [100, 0, 0, 0])
    sample = [dict(id=key, cost=cost, diversification=100, data=100, liquidity=80, access=100, asOf=1, eligible=eligible)
              for key, cost, eligible in (("A", .005, True), ("B", .02, True), ("C", .001, False), ("D", None, True))]
    verify("ranking", [item["id"] for item in rank(sample)] == ["A", "B"])
    for permutation in itertools.permutations(sample):
        verify("ranking", rank(list(permutation)) == rank(sample))
    cheaper = dict(sample[1], cost=.004)
    verify("ranking", rank([sample[0], cheaper])[0]["id"] == "B")
    tied = [dict(sample[0], id="Z"), dict(sample[0], id="A")]
    verify("ranking", rank(tied)[0]["id"] == "A")
    for budget in (0, 1, 100, 1000, 10000, 100000, 10000000):
        for price, lot, rate, fixed in itertools.product((1, 123, 10000), (1, 100), (0, .0015, .01), (0, 100)):
            principal, fee, residual = spend_plan(budget, price, lot, rate, fixed)
            verify("orders", principal + fee + residual == budget and min(principal, fee, residual) >= 0)
            verify("orders", principal % (price * lot) == 0)
    # Ledger replay/dedup and downward income corrections use durable IDs in production.
    ledger = {}
    for key, value in (("purchase-A", 5000), ("purchase-A", 5000), ("purchase-B", 1000)):
        ledger.setdefault(key, value)
    verify("ledger", sum(ledger.values()) == 6000)
    verify("ledger", max(0, 4000 - sum(ledger.values())) == 0)
    reference = {"amounts": [100, 200], "ranking": ["A", "B"], "sources": ["S1"]}
    verify("ai_contract", validate_ai_fields(reference, reference))
    verify("ai_contract", not validate_ai_fields(dict(reference, amounts=[100, 201]), reference))
    verify("ai_contract", not validate_ai_fields(dict(reference, sources=["invented"]), reference))
    verify("ai_contract", not validate_ai_fields(dict(reference, ranking=["B", "A"]), reference))
    for operation in (
        lambda: quota(-1), lambda: quota("NaN"),
        lambda: profile([3, 3, 3], 6, True, 120),
        lambda: profile([3, 3, 3, 4], 6, True, 120),
        lambda: allocation(2, .20, .01),
        lambda: allocation(3, .35, .06),
        lambda: split_minor_units(100, (.3, .3, .3, 0)),
        lambda: payment_dates(2026, 10, "WEEKLY", 7),
        lambda: spend_plan(100, 0, 1, 0),
    ):
        try:
            operation()
        except ValueError:
            verify("invalid_input", True)
        else:
            raise AssertionError("invalid input accepted")
    beyond_model = {str(level): stress_loss(item["adjusted"], (0, -.25, -.80, -1.0)) for level, item in enumerate(stress.values())}
    return {"checks": CHECKS, "total_checks": sum(CHECKS.values()), "profile_cases": profiles,
            "stress": stress, "crypto_opt_in": crypto_weights, "ranking_example": rank(sample),
            "loss_under_unmodeled_more_severe_shock": beyond_model}


def historical_exploration():
    """Exploratory USD proxies, complete months 2019-2025; not an IDR backtest.

    Yahoo feed contract/licensing and adjusted methodology are not production-validated.
    Raw responses stay in memory; SHA-256 identifies this run's response.
    """
    symbols = ("BIL", "IEF", "VT")
    start = int(datetime(2018, 12, 1, tzinfo=timezone.utc).timestamp())
    end = int(datetime(2026, 1, 1, tzinfo=timezone.utc).timestamp())
    series, audit = {}, {}
    for symbol in symbols:
        query = urllib.parse.urlencode({"period1": start, "period2": end, "interval": "1d"})
        url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?{query}"
        try:
            request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 TracksterResearch"})
            with urllib.request.urlopen(request, timeout=20) as response:
                raw = response.read()
            chart = json.loads(raw)["chart"]
            if chart.get("error") or not chart.get("result"):
                raise ValueError(str(chart.get("error")))
            data = chart["result"][0]
            timestamps = data["timestamp"]
            prices = data["indicators"]["adjclose"][0]["adjclose"]
            if len(timestamps) != len(prices) or data["meta"]["currency"] != "USD":
                raise ValueError("length or currency mismatch")
            monthly, valid, invalid = {}, 0, 0
            dates = []
            for timestamp, price in zip(timestamps, prices):
                if price is None or not math.isfinite(price) or price <= 0:
                    invalid += 1
                    continue
                observed = datetime.fromtimestamp(timestamp, timezone.utc).date()
                dates.append(observed.isoformat())
                monthly[observed.strftime("%Y-%m")] = price
                valid += 1
            series[symbol] = monthly
            audit[symbol] = {"url": url, "sha256": hashlib.sha256(raw).hexdigest(), "currency": "USD", "daily_points": valid,
                             "invalid_points": invalid, "duplicate_dates": len(dates) - len(set(dates)), "first": min(dates), "last": max(dates),
                             "monthly_points": len(monthly), "sorted_timestamps": timestamps == sorted(timestamps)}
        except Exception as error:
            audit[symbol] = {"url": url, "error": f"{type(error).__name__}: {error}"}
    if len(series) != len(symbols):
        return {"audit": audit, "status": "incomplete; no backtest"}
    months = [f"{year}-{month:02}" for year in range(2019, 2026) for month in range(1, 13)]
    required = ["2018-12"] + months
    missing = {symbol: [month for month in required if month not in series[symbol]] for symbol in symbols}
    if any(missing.values()):
        return {"audit": audit, "status": "missing months; no backtest", "missing": missing}
    returns = [[series[symbol][month] / series[symbol][previous] - 1 for symbol in symbols]
               for previous, month in zip(required, months)]

    def evaluate(weights, first=0, last=len(returns)):
        # Monthly reset to fixed weights, fractional units, no cashflows, USD.
        value, peak, drawdown, costs = 1.0, 1.0, 0.0, 0.0
        monthly_returns = []
        for row in returns[first:last]:
            gross = sum(weight * ret for weight, ret in zip(weights, row))
            drift = [weight * (1 + ret) / (1 + gross) for weight, ret in zip(weights, row)]
            one_way_turnover = sum(abs(a - b) for a, b in zip(drift, weights)) / 2
            transaction_cost = one_way_turnover * .001  # synthetic cost hypothesis; not broker tariff
            net = (1 + gross) * (1 - transaction_cost) - 1
            value *= 1 + net
            costs += transaction_cost
            peak = max(peak, value)
            drawdown = max(drawdown, 1 - value / peak)
            monthly_returns.append(net)
        years = (last - first) / 12
        return {"months": len(monthly_returns), "cagr": value ** (1 / years) - 1,
                "max_drawdown_month_end": drawdown, "annualized_volatility": statistics.stdev(monthly_returns) * math.sqrt(12),
                "sum_monthly_cost_rates": costs}

    mixes = {f"profile_{level}": tuple(allocation(level, limit)[:3]) for level, limit in enumerate((0, .10, .20, .35))}
    mixes.update({"equal_weight": (1/3, 1/3, 1/3), "equity_only": (0, 0, 1)})
    results = {name: {"weights": list(weights), "full_2019_2025": evaluate(weights),
                      "early_2019_2022": evaluate(weights, 0, 48), "later_2023_2025": evaluate(weights, 48, 84)}
               for name, weights in mixes.items()}
    return {"status": "exploratory only", "audit": audit, "results": results,
            "limitations": ["USD proxies, not IDR products", "adjusted prices not independently reconciled", "no cashflows or lot constraints",
                            "month-end drawdown understates intramonth loss", "0.1% turnover cost is synthetic", "no tax, FX, spread or initial purchase fee",
                            "fixed monthly rebalancing is a comparator, not proposed automatic trading", "no optimality or future return claim"]}


if __name__ == "__main__":
    output = {"version": VERSION, "checkedAt": datetime.now(timezone.utc).isoformat(), "synthetic": synthetic_checks()}
    if "--history" in sys.argv:
        output["historical"] = historical_exploration()
    print(json.dumps(output, indent=2, sort_keys=True))
