const stripe = Stripe('');

let elements;

async function initialize() {
  const response = await fetch('/crear-payment-intent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items: [{ id: 'producto_123' }] })
  });
  const { clientSecret } = await response.json();

  const appearance = {
    theme: 'stripe'
  };

  elements = stripe.elements({ appearance, clientSecret });

  const linkAuthElement = elements.create('linkAuthentication', {
    defaultValues: { email: 'usuario@ejemplo.com' }
  });
  linkAuthElement.mount('#link-authentication-element');

  linkAuthElement.on('change', (event) => {
    console.log('Email ingresado:', event.value.email);
  });

  const paymentElementOptions = { layout: 'tabs' };
  const paymentElement = elements.create('payment', paymentElementOptions);
  paymentElement.mount('#payment-element');
}

async function handleSubmit(event) {
  event.preventDefault();
  setLoading(true);

  const { error } = await stripe.confirmPayment({
    elements,
    confirmParams: {
      return_url: 'https://tusitio.com/checkout-completo',
    },
  });

  if (error) {
    showMessage(error.message);
  }
  setLoading(false);
}

function showMessage(messageText) {
  const messageContainer = document.querySelector('#payment-message');
  messageContainer.classList.remove('hidden');
  messageContainer.textContent = messageText;
  setTimeout(() => {
    messageContainer.classList.add('hidden');
    messageContainer.textContent = '';
  }, 4000);
}

function setLoading(isLoading) {
  const submitButton = document.querySelector('#submit');
  const spinner = document.querySelector('#spinner');
  const buttonText = document.querySelector('#button-text');
  if (isLoading) {
    submitButton.disabled = true;
    spinner.classList.remove('hidden');
    buttonText.classList.add('hidden');
  } else {
    submitButton.disabled = false;
    spinner.classList.add('hidden');
    buttonText.classList.remove('hidden');
  }
}

initialize();
document.querySelector('#payment-form').addEventListener('submit', handleSubmit);
