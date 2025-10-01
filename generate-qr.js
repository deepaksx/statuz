import QRCode from 'qrcode';

async function generateQR() {
    try {
        // Fetch QR code data from service
        const response = await fetch('http://localhost:3002/connection-state');
        const data = await response.json();

        if (data.status === 'QR_REQUIRED' && data.qrCode) {
            console.log('Generating QR code...');

            // Generate QR code as PNG
            await QRCode.toFile('whatsapp-qr.png', data.qrCode, {
                width: 400,
                margin: 2,
                errorCorrectionLevel: 'M'
            });

            console.log('\n✅ QR code saved as whatsapp-qr.png');
            console.log('📱 Open this file and scan it with WhatsApp!');
            console.log('\nTo open the QR code, run: start whatsapp-qr.png');
        } else {
            console.log(`Status: ${data.status}`);
            console.log(`Message: ${data.message || 'N/A'}`);
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

generateQR();
