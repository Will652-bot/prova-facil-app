const stripe = require('stripe')(process.env.STRIPE_WEBHOOK_SECRET);

exports.handler = async (event) => {
  const sig = event.headers['stripe-signature'];
  const body = event.body;

  try {
    const event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SIGNING_SECRET);
    console.log('Webhook reçu :', event.type);

    // Logique spécifique (exemple)
    if (event.type === 'payment_intent.succeeded') {
      console.log('Paiement réussi !', event.data.object);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ received: true }),
    };
  } catch (err) {
    console.error('Erreur de validation webhook :', err.message);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Signature invalide' }),
    };
  }
};
