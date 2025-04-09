const express = require('express');
const path = require('path');
const stripe = require('stripe')('sk_test_51RC1Q9Qc6RyEXYSHqsmTD4QvXJSOvncwE1gI2gfIcRdQaNdFK5cKrqJHbdHMtvohZhlH4GWJiILJI8Uc1BMXkIl100eXlteWWX');
const cors = require('cors');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// Asegura rutas estáticas correctas
app.use(express.static(path.join(__dirname, "css")));
app.use(express.static(path.join(__dirname, "js")));
app.use(express.static(path.join(__dirname, "imgs")));
app.use(express.static(path.join(__dirname, "hmtl"))); // CORREGIDO: 'hmtl' → 'html'

// Endpoint para crear sesión de Stripe
app.post('/create-checkout-session', async (req, res) => {
    try {
        const {
            service = "Servicio no especificado",
            price = "0",
            duration = "No especificado",
            date = "Fecha no definida",
            time = "Hora no definida",
            firstName = "Nombre no proporcionado",
            lastName = "Apellido no proporcionado",
            email = "Sin correo",
            phone = "Sin teléfono"
        } = req.body;

        console.log("🟢 Recibido del cliente:", req.body);

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'payment',
            customer_email: email,
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: service,
                            description: `Duración: ${duration}, Fecha: ${date}, Hora: ${time}`
                        },
                        unit_amount: parseInt(price) * 100, // en centavos
                    },
                    quantity: 1,
                },
            ],
            metadata: {
                service,
                price,
                duration,
                date,
                time,
                firstName,
                lastName,
                phone
            },
            success_url: 'http://127.0.0.1:5500/hmtl/success.html?session_id={CHECKOUT_SESSION_ID}',
            cancel_url: 'http://127.0.0.1:5500/html/cancel.html',
        });

        res.json({ url: session.url });

    } catch (error) {
        console.error('❌ Error al crear la sesión de pago:', error);
        res.status(500).json({ error: 'Error al crear la sesión de pago', message: error.message });
    }
});

// Ruta principal
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "hmtl", "main.html"));
});

app.get('/success', (req, res) => {
    res.sendFile(path.resolve(__dirname, "hmtl", 'success.html'));
});

app.listen(port, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${port}`);
});
