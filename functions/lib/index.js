const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
const { v4: uuidv4 } = require("uuid");
const stripe = require("stripe")("sk_test_51RLF0LRoBuwezMO9F64tEBKNgNBohjOnhLIrTVQHDEninOkVNA5Kr1K0jmcf54WxP4yY1ECVKL5RysCGpKqBkTGS00kIbrM37y");
const nodemailer = require("nodemailer");
const { onRequest } = require("firebase-functions/v2/https");

const domain = "antuanemakeup-7950c.web.app";

admin.initializeApp();
const db = admin.database();

const app = express();
app.use(cors({ origin: `https://${domain}` }));
app.use(express.json());

// Configuración de Nodemailer
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "gfloresv@ulasalle.edu.pe",
    pass: "kcpo kqxj derr jzii"
  }
});

/**
 * 1) POST /sendConfirmationEmail
 *    Guarda la reserva como "pendiente" y envía el correo de confirmación
 */
app.post("/sendConfirmationEmail", async (req, res) => {
  try {
    const { service, price, duration, date, time, firstName, lastName, phone, email, category } = req.body;
    if (!email || !firstName || !service || !date || !time || !category) {
      return res.status(400).json({ success: false, error: "Datos incompletos" });
    }

    const token = uuidv4();
    const timestamp = Date.now();

    // Guardar la reserva con la categoría
    await db.ref(`pendingConfirmations/${token}`).set({
      service, price, duration, date, time, category,  // Asegúrate de guardar la categoría
      firstName, lastName, phone, email,
      status: "pendiente", timestamp
    });

    // Enlace para confirmación
    const link = `https://us-central1-antuanemakeup-7950c.cloudfunctions.net/api/verifyTokenAndRedirect?token=${token}`;

    const mailOptions = {
      from: "gfloresv@ulasalle.edu.pe",
      to: email,
      subject: "Confirma tu reserva",
      html: `
        <p>Hola ${firstName},</p>
        <p>Por favor confirma tu reserva de la categoría ${category} haciendo clic en el botón:</p>
        <a href="${link}"
           style="padding:10px 20px;background:#28a745;color:#fff;
                  text-decoration:none;border-radius:4px;">
          Confirmar Reserva
        </a>
      `
    };

    await transporter.sendMail(mailOptions);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Error al enviar correo:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});


/**
 * 2) GET /verifyTokenAndRedirect
 *    Valida token, marca la reserva como "confirmada", crea sesión de Stripe y redirige
 */
app.get("/verifyTokenAndRedirect", async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).send("Token faltante");

    const snap = await db.ref(`pendingConfirmations/${token}`).once("value");
    const reservation = snap.val();
    if (!reservation) return res.status(404).send("Token inválido");

    if (Date.now() - reservation.timestamp > 3600000) {
      return res.status(410).send("El enlace ha expirado");
    }

    await db.ref(`pendingConfirmations/${token}`).update({ status: "confirmada" });

    const amount = Math.round(parseFloat(reservation.price) * 100);
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{
        price_data: {
          currency: "PEN",
          product_data: {
            name: reservation.service,
            description: `Duración: ${reservation.duration} min`
          },
          unit_amount: amount
        },
        quantity: 1
      }],
      mode: "payment",
      success_url: `https://${domain}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `https://${domain}/cancel.html`,
      customer_email: reservation.email,
      metadata: reservation
    });

    return res.redirect(session.url);
  } catch (err) {
    console.error("Error al verificar token:", err);
    return res.status(500).send(err.message);
  }
});

/**
 * 3) GET /getSession
 *    Recupera la sesión de Stripe de forma segura
 */
app.get("/getSession", async (req, res) => {
  try {
    const { session_id } = req.query;
    if (!session_id) return res.status(400).json({ error: "Falta session_id" });

    const session = await stripe.checkout.sessions.retrieve(session_id);
    return res.status(200).json(session);
  } catch (err) {
    console.error("Error retrieving session:", err);
    return res.status(err.statusCode || 500).json({ error: err.message });
  }
});

/**
 * 4) POST /createCheckoutSession (opcional)
 *    Crea sesión de Stripe sin paso de confirmación por correo
 */
app.post("/createCheckoutSession", async (req, res) => {
  try {
    const { service, price, duration, date, time, firstName, lastName, phone, email } = req.body;
    const amount = Math.round(parseFloat(price) * 100);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{
        price_data: {
          currency: "PEN",
          product_data: {
            name: service,
            description: `Duración: ${duration} min`
          },
          unit_amount: amount
        },
        quantity: 1
      }],
      mode: "payment",
      success_url: `https://${domain}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `https://${domain}/cancel.html`,
      customer_email: email,
      metadata: { service, duration, date, time, firstName, lastName, phone, price, category }
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error("Error creando sesión de Stripe:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 5) POST /sendCancellationEmail
 *    Envía correo con enlace de cancelación (token) para reembolso
 */
app.post("/sendCancellationEmail", async (req, res) => {
  try {
    const { reservationKey, session_id, email, date, time, firstName } = req.body;
    if (!reservationKey || !session_id || !email) {
      return res.status(400).json({ error: "Datos de cancelación incompletos" });
    }

    const cancelToken = uuidv4();
    const timestamp = Date.now();

    await db.ref(`pendingCancellations/${cancelToken}`).set({
      reservationKey,
      session_id,
      email,
      date,
      time,
      firstName,
      timestamp,
      status: "pendiente"
    });

    const link = `https://us-central1-antuanemakeup-7950c.cloudfunctions.net/api/cancelReservation?token=${cancelToken}`;

    await transporter.sendMail({
      from: "gfloresv@ulasalle.edu.pe",
      to: email,
      subject: "Cancelar tu reserva",
      html: `
        <p>Hola ${firstName},</p>
        <p>Si deseas cancelar tu reserva y obtener la devolución completa, haz clic en el botón de abajo.<br>
        Recuerda que sólo puedes hacerlo antes de 12 horas de tu reserva.</p>
        <a href="${link}"
           style="padding:10px 20px;background:#e74c3c;color:#fff;
                  text-decoration:none;border-radius:4px;">
          Cancelar Reserva
        </a>
      `
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Error enviando correo de cancelación:", err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * 6) GET /cancelReservation
 *    Valida token, comprueba ventana de 12h, realiza refund, elimina reserva
 */
app.get("/cancelReservation", async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).send("Token faltante");

    const snap = await db.ref(`pendingCancellations/${token}`).once("value");
    const cancelReq = snap.val();
    if (!cancelReq) return res.status(404).send("Token inválido");

    const reservaTime = new Date(`${cancelReq.date}T${cancelReq.time}:00`).getTime();
    if (reservaTime - Date.now() < 12 * 3600 * 1000) {
      return res.status(410).send("Ya no puedes cancelar (menos de 12h restantes).");
    }

    const session = await stripe.checkout.sessions.retrieve(cancelReq.session_id);
    await stripe.refunds.create({ payment_intent: session.payment_intent });

    await Promise.all([
      db.ref(`reservations/${cancelReq.reservationKey}`).remove(),
      db.ref(`pendingCancellations/${token}`).update({ status: "cancelada" })
    ]);

    return res.send("Tu reserva ha sido cancelada y el reembolso está en proceso.");
  } catch (err) {
    console.error("Error en cancelReservation:", err);
    return res.status(500).send(err.message);
  }
});

// Exportar la API como función HTTP de Firebase
exports.api = onRequest(
  { region: "us-central1", platform: "gcfv2", timeoutSeconds: 30 },
  app
);
