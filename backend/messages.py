"""
messages.py -- Template-based customer message generation per DIFFERENTIATORS.md.

Template-based, NOT a separate ML model -- simple, reliable, in-timeline.
One entry per failure_reason from DATA_SCHEMA.md taxonomy.
"""

TEMPLATES = {
    "insufficient_funds": (
        "Your payment of {currency}{amount} didn't go through because your account "
        "had insufficient funds. Please ensure sufficient balance is available and "
        "we'll retry automatically."
    ),
    "card_expired": (
        "Your card has expired. Please update your payment method to keep your "
        "{merchant_label} subscription active."
    ),
    "issuer_declined": (
        "Your bank declined this payment. Please contact your bank or try a "
        "different payment method to continue your {merchant_label} service."
    ),
    "do_not_honor": (
        "Your bank declined this payment. Please contact your bank or try a "
        "different card to keep your {merchant_label} service running."
    ),
    "processing_error": (
        "There was a temporary issue processing your payment of {currency}{amount}. "
        "We'll retry shortly -- no action needed from you."
    ),
    "network_timeout": (
        "There was a brief network issue with your payment. "
        "We'll automatically retry shortly."
    ),
    "card_stolen": (
        "This card has been flagged. Please update your payment details to "
        "keep your {merchant_label} subscription active."
    ),
    "account_closed": (
        "The bank account linked to this payment is no longer active. "
        "Please update your payment method to continue your {merchant_label} service."
    ),
}

MERCHANT_LABELS = {
    "saas": "SaaS",
    "d2c_subscription": "subscription",
    "ecommerce_one_time": "order",
}

CURRENCY_SYMBOLS = {"INR": "₹", "USD": "$", "EUR": "€"}


def generate_customer_message(
    failure_reason: str,
    amount: float = 0.0,
    currency: str = "INR",
    merchant_category: str = "saas",
) -> str:
    """
    Generate the customer-facing message for a given failure state.
    Returns a formatted string ready to display or send.
    """
    template = TEMPLATES.get(failure_reason, TEMPLATES["processing_error"])
    symbol = CURRENCY_SYMBOLS.get(currency, currency)
    merchant_label = MERCHANT_LABELS.get(merchant_category, "service")

    # Format amount: no decimals for whole numbers
    if amount == int(amount):
        amount_str = f"{int(amount):,}"
    else:
        amount_str = f"{amount:,.2f}"

    return template.format(
        currency=symbol,
        amount=amount_str,
        merchant_label=merchant_label,
    )
