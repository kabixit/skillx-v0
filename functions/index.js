const functions = require('firebase-functions');
const axios = require('axios');

exports.verifyCourseraCert = functions.https.onCall(async (certificateCode) => {
  if (!certificateCode?.trim()) return { valid: false };
  
  const certUrl = `https://www.coursera.org/account/accomplishments/certificate/${certificateCode.trim()}`;
  
  try {
    // Use HEAD request for fastest validation
    const response = await axios.head(certUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 3000
    });
    return { 
      valid: response.status === 200,
      url: certUrl
    };
  } catch (error) {
    return { valid: false };
  }
});