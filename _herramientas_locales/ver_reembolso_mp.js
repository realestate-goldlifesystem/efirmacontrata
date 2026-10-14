// Qué dice Mercado Pago de un pago y sus devoluciones. Solo lee (GET).
// No imprime datos personales del pagador ni la llave.
// Uso: node ver_reembolso_mp.js <ID de pago de Mercado Pago>
const fs = require('fs'); const path = require('path');
const fuente = fs.readFileSync(path.join(__dirname, '../backend/API_MERCADOPAGO.js'), 'utf8');
const TOKEN = (fuente.match(/^const MP_ACCESS_TOKEN = '([^']+)'/m) || [])[1];
const id = String(process.argv[2] || '').trim();
if (!TOKEN || !id) { console.error('Falta la llave o el ID.'); process.exit(1); }
const get = async (url) => { const r = await fetch(url, { headers: { Authorization: 'Bearer ' + TOKEN } }); return { status: r.status, cuerpo: await r.json().catch(() => ({})) }; };
const f = (x) => x ? new Date(x).toLocaleString('es-CO', { timeZone: 'America/Bogota' }) : '—';
(async () => {
  const { status, cuerpo: p } = await get('https://api.mercadopago.com/v1/payments/' + id);
  if (status !== 200) return console.log('Mercado Pago respondió', status, JSON.stringify(p).slice(0, 300));
  console.log('PAGO', p.id);
  console.log('  estado              :', p.status, '/', p.status_detail);
  console.log('  medio de pago       :', p.payment_type_id, '/', p.payment_method_id);
  console.log('  monto               :', p.transaction_amount, p.currency_id, '| devuelto:', p.transaction_amount_refunded);
  console.log('  creado / aprobado   :', f(p.date_created), '/', f(p.date_approved));
  console.log('  última actualización:', f(p.date_last_updated));
  console.log('  referencia externa  :', p.external_reference);
  const { cuerpo: refunds } = await get('https://api.mercadopago.com/v1/payments/' + id + '/refunds');
  const lista = Array.isArray(refunds) ? refunds : (p.refunds || []);
  console.log('\nDEVOLUCIONES:', lista.length);
  lista.forEach(r => {
    console.log('  - id', r.id, '| estado:', r.status, '| monto:', r.amount, '| creada:', f(r.date_created));
    console.log('    origen:', JSON.stringify(r.source || {}), '| tipo:', r.refund_mode || '', '| motivo:', r.reason || '');
    if (r.unique_sequence_number) console.log('    número de rastreo (ARN/secuencia):', r.unique_sequence_number);
    const extra = Object.keys(r).filter(k => !['id', 'payment_id', 'amount', 'metadata', 'source', 'date_created', 'unique_sequence_number', 'refund_mode', 'adjustment_amount', 'status', 'reason', 'labels', 'amount_refunded_to_payer', 'partition_details', 'expanded_status'].includes(k));
    if (extra.length) console.log('    otros campos:', extra.map(k => k + '=' + JSON.stringify(r[k])).join(' ').slice(0, 300));
    if (r.amount_refunded_to_payer !== undefined) console.log('    devuelto al pagador:', r.amount_refunded_to_payer);
    if (r.expanded_status) console.log('    detalle:', JSON.stringify(r.expanded_status).slice(0, 300));
  });
})().catch(e => { console.error(e.message); process.exit(1); });
