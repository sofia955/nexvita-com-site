/* NexVita — formulário do diagnóstico (/diagnostico/), envia direto ao CRM.
   Contrato: crm-atual/docs/integracao-carol.md (repo mori1982/crm_nexvita).
   O CRM recusa campo desconhecido: o payload abaixo leva só os campos aceitos. */
(function () {
  var form = document.getElementById('form-diagnostico');
  if (!form) return;
  var status = form.querySelector('.status');
  var btn = form.querySelector('button[type=submit]');
  var aberto = new Date().toISOString();
  var CLICK = ['gclid', 'gbraid', 'wbraid', 'fbclid'];
  var UTM = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];

  // Guarda a origem do anúncio na sessão (o site.js guarda utm/gclid/fbclid; aqui somamos gbraid/wbraid).
  try {
    var q = new URLSearchParams(location.search);
    UTM.concat(CLICK).forEach(function (k) { if (q.get(k)) sessionStorage.setItem('nv_' + k, q.get(k)); });
    if (!sessionStorage.getItem('nv_landing_url')) sessionStorage.setItem('nv_landing_url', location.href.split('#')[0]);
    if (!sessionStorage.getItem('nv_referrer') && document.referrer) sessionStorage.setItem('nv_referrer', document.referrer);
  } catch (e) {}

  function f(n) { return form.elements.namedItem(n); } // evita form.name/form.role (propriedades nativas do form)
  function sessao(k) { try { return sessionStorage.getItem('nv_' + k) || ''; } catch (e) { return ''; } }
  function limpa(v, max) { return String(v || '').trim().slice(0, max); }
  function idClique(v) { v = limpa(v, 512); return /^[A-Za-z0-9._~-]+$/.test(v) ? v : ''; }
  function urlOk(v) { v = limpa(v, 2000); return /^https?:\/\/\S+$/.test(v) ? v : ''; }
  function msg(cls, txt) { status.className = 'status full ' + cls; status.textContent = txt; }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    e.stopImmediatePropagation(); // o handler genérico do site.js (form.lead) não roda aqui
    msg('', '');
    if (f('website') && f('website').value) return; // honeypot
    if (!form.checkValidity()) { form.reportValidity(); return; }
    var tel = f('phone').value.replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '');
    if (!/^[1-9]\d{9,10}$/.test(tel)) { msg('err', 'Confira o WhatsApp com DDD, por exemplo (11) 98765-4321.'); f('phone').focus(); return; }

    var p = {
      form_id: form.dataset.formId,
      name: limpa(f('name').value, 120),
      phone: limpa(f('phone').value, 30),
      email: limpa(f('email').value, 200),
      company_name: limpa(f('company_name').value, 200),
      specialty: limpa(f('specialty').value, 100),
      city: limpa(f('city').value, 100),
      role: f('role').value,
      team_size: f('team_size').value,
      revenue_band: f('revenue_band').value,
      main_pain: limpa(f('main_pain').value, 500),
      consent: true,
      consent_text_version: form.dataset.consentVersion,
      landing_url: urlOk(sessao('landing_url') || location.href.split('#')[0]),
      referrer: urlOk(sessao('referrer') || document.referrer),
      website: '',
      started_at: aberto
    };
    UTM.forEach(function (k) { p[k] = limpa(sessao(k), 200); });
    CLICK.forEach(function (k) { p[k] = idClique(sessao(k)); });

    btn.disabled = true; btn.textContent = 'Enviando';
    fetch(form.dataset.crm, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) })
      .then(function (r) {
        if (r.status === 201) {
          form.reset();
          msg('ok', 'Recebemos. Em até um dia útil a equipe da NexVita chama você no WhatsApp para marcar a conversa.');
          if (window.gtag) window.gtag('event', 'generate_lead', { form: 'diagnostico' });
          return;
        }
        if (r.status === 400) throw new Error('dados');
        if (r.status === 429) throw new Error('limite');
        throw new Error('falha');
      })
      .catch(function (err) {
        var m = err && err.message;
        if (m === 'dados') msg('err', 'Algum campo não foi aceito. Confira os dados e tente de novo, ou fale com a gente pelo WhatsApp.');
        else if (m === 'limite') msg('err', 'Recebemos muitos envios agora. Fale com a gente pelo WhatsApp (11) 96820-8000.');
        else msg('err', 'Não foi possível enviar agora. Fale com a gente pelo WhatsApp (11) 96820-8000 ou escreva para contato@nexvita.com.');
      })
      .then(function () { btn.disabled = false; btn.textContent = 'Quero o diagnóstico'; });
  });
})();
