/* eslint-disable */
// import axios from 'axios';
// import { showAlert } from './alerts';
// // Stripe no longer supports this way
// const stripe = Stripe(
//   'pk_test_51P7t7IP7lbqQxZowOv7QFt6m6nIhzZiGI7fa5OFV2MJz7aevHliGNyoVTpRUzrN9k5aqysYhFV9BPqESPiiIasA2000PTyUkf4',
// );

// export const bookTour = async (tourId) => {
//   try {
//     // 1) Get checkout session from API
//     const session = await axios(
//       `http://127.0.0.1:3000/api/v1/bookings/checkout-session/${tourId}`,
//     );
//     console.log(session);

//     // 2) Create checkout form + chanre credit card
//     await stripe.redirectToCheckout({
//       sessionId: session.data.session.id,
//     });
//   } catch (err) {
//     console.log(err);
//     showAlert('error', err);
//   }
// };
