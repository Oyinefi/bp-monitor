exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let body;
  try { body = JSON.parse(event.body); } 
  catch(e) { return { statusCode: 400, body: 'Invalid JSON' }; }

  const { readings, averages, classification, patientName } = body;
  if (!readings || !averages) return { statusCode: 400, body: 'Missing data' };

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const CLINIC_EMAIL = 'oyinefi@gmail.com';

  const readingRows = readings.map((r, i) =>
    `<tr style="border-bottom:1px solid #eee">
      <td style="padding:10px 16px;color:#666">Day ${i + 1}</td>
      <td style="padding:10px 16px;font-weight:600">${r.sys}/${r.dia} mmHg</td>
      <td style="padding:10px 16px">${r.pul} bpm</td>
      <td style="padding:10px 16px;color:${r.status === 'high' ? '#c0392b' : r.status === 'elevated' ? '#e67e22' : '#27ae60'}">${r.status === 'high' ? 'High' : r.status === 'elevated' ? 'Elevated' : 'Normal'}</td>
    </tr>`
  ).join('');

  const cls = classification;
  const statusLabel = cls === 'high' ? 'HIGH BLOOD PRESSURE' : cls === 'elevated' ? 'ELEVATED' : 'NORMAL';
  const name = patientName || 'Patient';
  const date = new Date().toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' });

  const emailHtml = `<html><body style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto">
    <div style="background:#1a1612;color:white;padding:24px;border-radius:12px 12px 0 0">
      <div style="font-size:11px;opacity:0.5;margin-bottom:4px">7-DAY BP MONITORING REPORT</div>
      <div style="font-size:22px">${name} · ${date}</div>
    </div>
    <div style="background:#2c2420;color:white;padding:20px 24px">
      <div style="font-size:13px;opacity:0.5;margin-bottom:12px">7-DAY AVERAGES</div>
      <div style="font-size:40px;font-weight:300">${averages.sys}/${averages.dia} <span style="font-size:16px">mmHg</span></div>
      <div style="font-size:16px;margin-top:4px">Pulse: ${averages.pul} bpm</div>
      <div style="margin-top:12px;padding:6px 14px;display:inline-block;border-radius:20px;font-weight:600;font-size:13px;background:${cls==='high'?'rgba(192,57,43,0.4)':cls==='elevated'?'rgba(230,126,34,0.4)':'rgba(39,174,96,0.4)'}">
        ${statusLabel}
      </div>
    </div>
    <div style="padding:20px 24px;border:1px solid #eee;border-top:none">
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <tr style="border-bottom:2px solid #eee;color:#999;font-size:12px">
          <th style="padding:8px;text-align:left">Day</th>
          <th style="padding:8px;text-align:left">BP</th>
          <th style="padding:8px;text-align:left">Pulse</th>
          <th style="padding:8px;text-align:left">Status</th>
        </tr>
        ${readingRows}
      </table>
    </div>
    <div style="padding:16px 24px;background:#f5f5f5;font-size:12px;color:#999;border-radius:0 0 12px 12px">
      Patient completed full 7-day home monitoring protocol
    </div>
  </body></html>`;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'BP Monitor <onboarding@resend.dev>',
        to: [CLINIC_EMAIL],
        subject: `BP Report — ${name} · ${averages.sys}/${averages.dia} mmHg · ${statusLabel}`,
        html: emailHtml,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Resend error:', err);
      return { statusCode: 500, body: JSON.stringify({ error: 'Email failed' }) };
    }

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch(err) {
    console.error('Error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Server error' }) };
  }
};
