const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const RESEND_API_KEY = 're_E3TQQdWm_Eh3GPceYVWWuKGn3uC2Z85FJ';
const TO_EMAIL = 'sivarajofficial7@gmail.com';

const server = http.createServer((req, res) => {
    // Enable CORS for file:// and localhost origins
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // Serve HTML page
    if (req.method === 'GET' && (req.url === '/' || req.url === '/mp.html')) {
        fs.readFile(path.join(__dirname, 'mp.html'), (err, data) => {
            if (err) {
                res.writeHead(500);
                res.end('Error loading mp.html');
            } else {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(data);
            }
        });
        return;
    }

    // Resend Email Endpoint
    if (req.method === 'POST' && req.url === '/api/send-email') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const formData = JSON.parse(body);
                const { name, email, mobile, location, message } = formData;

                const emailData = JSON.stringify({
                    from: 'Mahabir Packaging <onboarding@resend.dev>',
                    to: [TO_EMAIL],
                    subject: `New Packaging Inquiry from ${name}`,
                    html: `
                        <div style="font-family: Arial, sans-serif; padding: 24px; color: #1e293b; max-width: 600px; border: 1px solid #e2e8f0; border-radius: 12px;">
                            <h2 style="color: #dc2626; border-bottom: 2px solid #dc2626; padding-bottom: 10px; margin-top: 0;">New Packaging Inquiry</h2>
                            <p><strong>Full Name:</strong> ${name}</p>
                            <p><strong>Email Address:</strong> <a href="mailto:${email}">${email}</a></p>
                            <p><strong>Mobile Number:</strong> ${mobile}</p>
                            <p><strong>Location / City:</strong> ${location || 'Not provided'}</p>
                            <p><strong>Packaging Requirements:</strong></p>
                            <div style="background-color: #f8fafc; border-left: 4px solid #dc2626; padding: 12px 16px; font-style: italic; margin-top: 8px;">
                                ${message ? message.replace(/\n/g, '<br>') : 'N/A'}
                            </div>
                        </div>
                    `
                });

                const options = {
                    hostname: 'api.resend.com',
                    port: 443,
                    path: '/emails',
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${RESEND_API_KEY}`,
                        'Content-Length': Buffer.byteLength(emailData)
                    }
                };

                const resendReq = https.request(options, resendRes => {
                    let resendBody = '';
                    resendRes.on('data', chunk => resendBody += chunk);
                    resendRes.on('end', () => {
                        console.log(`[Resend API] Response (${resendRes.statusCode}):`, resendBody);
                        if (resendRes.statusCode >= 200 && resendRes.statusCode < 300) {
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ success: true, message: 'Email sent successfully!' }));
                        } else {
                            res.writeHead(400, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ success: false, error: resendBody }));
                        }
                    });
                });

                resendReq.on('error', err => {
                    console.error('[Resend API Error]:', err);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: err.message }));
                });

                resendReq.write(emailData);
                resendReq.end();
            } catch (err) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: 'Invalid JSON format' }));
            }
        });
        return;
    }

    // Static file handler fallback
    const safePath = path.normalize(req.url).replace(/^(\.\.[\/\\])+/, '');
    const filePath = path.join(__dirname, safePath);
    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404);
            res.end('Not Found');
        } else {
            res.writeHead(200);
            res.end(data);
        }
    });
});

server.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(` Mahabir Packaging Local Web & Email Server Started `);
    console.log(` Open Website in Browser: http://localhost:${PORT}/ `);
    console.log(` Resend Email Target: ${TO_EMAIL} `);
    console.log(`====================================================`);
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.log(`\n⚠️  Port ${PORT} is already in use.`);
        console.log(`   The server may already be running.`);
        console.log(`   👉 Open: http://localhost:${PORT}/`);
        console.log(`   To stop old server: run the following command:`);
        console.log(`   npx kill-port ${PORT}\n`);
        process.exit(0);
    } else {
        throw err;
    }
});
