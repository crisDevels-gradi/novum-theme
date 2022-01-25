
// IIFE to not muddy up the global context
(function () {
  let customer = JSON.parse(`{{ customer | json }}`);
  const { renderPaymentMethodDetails, createPaymentMethodDetails } = ReCharge.Components;
  const { settings } = ReCharge.Novum;
  const { translations } = ReCharge;
  const { createSpinner, getAddressDom } = ReCharge.Novum.DomCreators;
  const { renderAddress } = ReCharge.Novum.Components;
  const { addAccessibleClickListener } = ReCharge.Novum.Utils;

  // State of all the subscription data we use. Basically caches data we don't need to keep fetching
  const state = {
    shippingAddresses: undefined
  };

  /** Fetches the passed in request and stores it into our state */
  async function fetchState({ content, request, key }) {
    const loadingEl = document.createElement('div');
    loadingEl.classList.add('loading', 'd-flex', 'justify-center', 'mt-5');
    // Setup the loading spinner while we are fetching
    loadingEl.append(createSpinner({ size: 42 }));
    content.prepend(loadingEl);
    if (!state[key]) {
      state[key] = await request();
    }
    loadingEl.classList.add('d-none');

    return state[key];
  }

  /** Renders the current address and it's payment method and forces a refetch the next time addresses are requested */
  function renderShippingAndBilling(address) {
    renderAddress(address, document.querySelector('[data-shipping]'));
    // Force a reload of addresses
    delete state.shippingAddresses;

    const paymentMethod = address.include.payment_methods[0]; // Selected is always the first
    const paymentMethodCardElement = document.querySelector('[data-billing]');

    if (paymentMethod) {
      renderPaymentMethodDetails(paymentMethod, paymentMethodCardElement);
    } else {
      paymentMethodCardElement.innerHTML = `<p>${translations.subscription.noPaymentMethod}</p>` 
    }
  }

  async function onUpdateShippingAddress() {
    const shippingContent = document.querySelector('.subscription-shipping-and-billing [data-shipping]');
    const billingContent = document.querySelector('.subscription-shipping-and-billing [data-billing]');

    ReCharge.Drawer.open({
      header: translations.subscription.address.editShippingAndBilling,
      content: `
        <h4 class="rc-subheading">${translations.subscription.address.shippingAndBillingHeader}</h4>
        ${shippingContent?.innerHTML}
        <div class="my-4"></div>
        ${billingContent?.innerHTML}
        <div class="divider my-5"></div>
        <h4 class="rc-subheading">${translations.subscription.address.otherHeader}</h4>
        <div class="other-shipping-addresses"></div>
      ` });


    const otherShippingAddressesEl = document.querySelector('.other-shipping-addresses');
    const rcShippingAddresses = await fetchState({ key: 'shippingAddresses', content: otherShippingAddressesEl, request: ReCharge.Api.getShippingAddresses });

    const currentShippingAddressId = Number(shippingContent?.firstElementChild?.getAttribute('data-id'));

    // Get the current address and check if it's sci. Only allow valid addresses
    const validShippingAddresses = rcShippingAddresses.filter(addr => {
      const paymentMethod = addr.include.payment_methods[0];
      if (!paymentMethod) return false; // Don't allow addresses without a payment method

      const isSameAsCurrent = addr.id === currentShippingAddressId; // Don't allow same address to be selected
      return !isSameAsCurrent;
    });

    // Add all the valid addresses to the dom
    validShippingAddresses.forEach((address) => {
      const addressEl = document.createElement('div');
      const paymentMethod = address?.include?.payment_methods[0];

      addressEl.innerHTML = `
        ${getAddressDom(address)}
        <div class="my-4"></div>
        ${paymentMethod ? createPaymentMethodDetails(paymentMethod) : ''}
        <button class="update-shipping-address rc-btn rc-btn--primary mt-3" data-id="${address.id}">${translations.subscription.address.pairChangeBtn}</button>
      `;
 
      otherShippingAddressesEl.append(addressEl)
    });

    if (!validShippingAddresses.length) {
      const emptyEl = document.createElement('p');
      emptyEl.innerHTML = translations.subscription.address.noResults;
      otherShippingAddressesEl.append(emptyEl);
    }

    // Go through and add the update events to all the valid addresses
    document.getElementById('te-modal').querySelectorAll('button.update-shipping-address').forEach((el) => {
      el.addEventListener('click', async (e) => {
        const { subscription } = ReCharge.Novum;
        try {
          const addressId = Number(e.target.getAttribute('data-id'));
          // Mocked for now until endpoint exists
          const { subscription: updatedSubscription, address: updatedAddress } = await ReCharge.Api.submitRequest(() => ReCharge.Api.updateSubscriptionAddress(subscription.id, addressId), {
            key: 'updateShippingAddress',
            submitButton: e.target,
            successMessage: translations.subscription.address.pairSuccess
          });
          // Updating current subscription and adding the new address to it (subscription response doesn't have it associated)
          ReCharge.Novum.subscription = { ...subscription, ...updatedSubscription, address: updatedAddress };
          renderShippingAndBilling(updatedAddress);

          ReCharge.Drawer.close();
        } catch (err) { }
      });
    });
  }

  function onEditEmailClick() {
    ReCharge.Drawer.open({
      header: translations.email.updateHeader,
      content: `
        <p class="rc-subtext text-center">${translations.email.info}</p>
        <form id="RechargeEmailForm">
          <div role="group" class="rc-form-control mt-2">
            <label id="email-label" for="email" class="rc-form__label">{{ 'Email' | t }}</label>
            <input type="text" id="email" class="rc-input" type="text" name="email" value="${customer.email}">
          </div>
          <button type="submit" class="update-email rc-btn rc-btn--primary">${translations.common.updateBtn}</button>
        </form>
      ` });

    document.forms.RechargeEmailForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const email = document.getElementById('email').value;
        const updatedCustomer = await ReCharge.Api.submitRequest(() => ReCharge.Api.updateCustomer({ email }), {
          key: 'updateEmail',
          submitButton: e.target.querySelector('button[type="submit"]'),
          successMessage: translations.email.success
        });
        // Update the customers email
        customer = updatedCustomer;
        document.querySelector('.customer-email .email').innerHTML = customer.email;
        ReCharge.Drawer.close();
      } catch (err) { }
      return false;
    });
  }

  renderShippingAndBilling(ReCharge.Novum.subscription.address);

  addAccessibleClickListener(document.querySelector('.customer-email'), onEditEmailClick);

  const isExpired = ReCharge.Novum.subscription.status.toLowerCase() === 'expired';
  // Don't allow user to edit address if it's turned off 
  if (settings.customer_portal.edit_shipping_address && !isExpired) {
    addAccessibleClickListener(document.querySelector('.subscription-shipping-and-billing'), onUpdateShippingAddress);
  }
})()
