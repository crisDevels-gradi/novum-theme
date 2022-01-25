function renderOrderDetails(event) {
    event.preventDefault();

    const { formatCurrency } = ReCharge.Utils;

    const orderId = event.target.closest(".rc_card_container").dataset.id;
    const order = ReCharge.Novum.orders.find((order) => order.id == orderId);
    const currencyCode = order.currency;

    ReCharge.Novum.sidebarHeading.textContent = `{{ 'Order_Details' | t }}`;
    ReCharge.Novum.sidebarContent.innerHTML = `{% include '_order_details.html' %}`;

    let shippingPrice = 0.0;

    order.shipping_lines &&
        order.shipping_lines.forEach(
            (item) => (shippingPrice += Number(item.price))
        );

    // Populate values in the modal
    document.querySelector(
        ".order-number"
    ).textContent = `{{ 'Order' | t }} #${order.shopify_order_number}`;

    const localDate = ReCharge.Novum.Utils.getLocalDate(
        order.processed_at,
        "en-us"
    );
    const translatedDate = ReCharge.Novum.Utils.translateMonth(localDate);
    document.querySelector(".order-date").textContent = ` ${translatedDate}`;

    document.querySelector(".order-shipping").textContent = `${formatCurrency(
        shippingPrice,
        order.currency
    )}`;

    const orderDiscounts =
        order.total_discounts != null
            ? Number(order.total_discounts).toFixed(2)
            : "0.00";
    document.querySelector(".order-discounts").textContent = ` ${formatCurrency(
        -orderDiscounts,
        currencyCode
    )}`;

    const orderTaxes = order.total_tax != 0 ? order.total_tax : "0.00";
    document.querySelector(".order-taxes").textContent = ` ${formatCurrency(
        orderTaxes,
        currencyCode
    )}`;

    document.querySelector(".order-total").textContent = ` ${formatCurrency(
        order.total_price,
        order.currency
    )}`;

    order.line_items.forEach((line_item) => {
        const { quantity, title, price, variant_title, images } = line_item;
        const lineItemsContainer = document.querySelector(".order-line-items");
        const variantLine = variant_title
            ? `<p class="order-variant-title">${variant_title}</p>`
            : "";
        let imageSrc =
            images.original ||
            "//rechargeassets-bootstrapheroes-rechargeapps.netdna-ssl.com/static/images/no-image.png";

        lineItemsContainer.innerHTML += `
            <div class="element__border--top rc_card_container">
                <div class="d-flex align-items-center">
                    <span class="order-photo">
                        <img src="${imageSrc}" alt="${title}">
                    </span>
                    <div>
                        <span class="rc_order_title">${title.replace(
                            "Auto renew",
                            ""
                        )}</span>
                        ${variantLine}
                        <p class="order-quantity">{{ 'Quantity' | t }}: ${quantity}</p>
                    </div>
                </div>
                <span class="order-price text-font-14">${formatCurrency(
                    price,
                    order.currency
                )}</span>
            </div>
        `;
    });

    ReCharge.Novum.toggleSidebar(event.currentTarget);
}
