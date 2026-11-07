/* Núcleo de cálculo: copia fiel de zzzz/nucleo (dinero, tributos, tasa_annp, honorarios, whatsapp, calculo).
   Nunca float: guaraníes como entero, USD/R$ y cambios como decimal exacto (BigInt). */
(function (raiz) {
  'use strict';
  const B = BigInt, P10 = n => 10n ** B(n);
  const digitos = x => (x < 0n ? -x : x).toString().length;

  // ---------- Decimal exacto (como decimal.Decimal de Python, precisión 28) ----------
  class Dec {
    constructor(i, s) { this.i = i; this.s = s; }          // valor = i × 10^-s
    static de(x) {
      if (x instanceof Dec) return x;
      if (typeof x === 'bigint') return new Dec(x, 0);
      if (typeof x === 'number') {
        if (!Number.isInteger(x)) throw new TypeError('No se usan float para dinero');
        return new Dec(B(x), 0);
      }
      let s = String(x == null ? '' : x).trim().replace(/\s/g, '');
      if (!s) return new Dec(0n, 0);
      if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');   // 1.234,56
      else if ((s.match(/\./g) || []).length > 1) s = s.replace(/\./g, ''); // 1.234.567
      const m = /^([+-]?)(\d*)(?:\.(\d*))?$/.exec(s);
      if (!m || (m[2] + (m[3] || '')) === '') throw new Error('Número inválido: ' + x);
      const fr = m[3] || '';
      const i = B((m[2] || '0') + fr);
      return new Dec(m[1] === '-' ? -i : i, fr.length);
    }
    al(s) { return s >= this.s ? this.i * P10(s - this.s) : null; }
    mas(o) { o = Dec.de(o); const s = Math.max(this.s, o.s); return new Dec(this.al(s) + o.al(s), s); }
    menos(o) { o = Dec.de(o); const s = Math.max(this.s, o.s); return new Dec(this.al(s) - o.al(s), s); }
    por(o) { o = Dec.de(o); return new Dec(this.i * o.i, this.s + o.s); }
    entre(o) {                      // división con 28 cifras significativas, mitad al par (Python)
      o = Dec.de(o);
      if (o.i === 0n) throw new Error('División por cero');
      if (this.i === 0n) return new Dec(0n, 0);
      const neg = (this.i < 0n) !== (o.i < 0n);
      const A = this.i < 0n ? -this.i : this.i, Bd = o.i < 0n ? -o.i : o.i;
      const k = Math.max(0, 30 + digitos(Bd) - digitos(A));
      let q = A * P10(k) / Bd; const r = A * P10(k) % Bd;
      let esc = this.s - o.s + k;
      const n = digitos(q);
      if (n > 28) {
        const drop = n - 28, p = P10(drop), resto = q % p, mitad = 5n * P10(drop - 1);
        q = q / p; esc -= drop;
        if (resto > mitad || (resto === mitad && (r > 0n || q % 2n === 1n))) q += 1n;
      }
      while (esc > 0 && q % 10n === 0n) { q /= 10n; esc--; }   // saca ceros sobrantes
      if (esc < 0) { q *= P10(-esc); esc = 0; }
      return new Dec(neg ? -q : q, esc);
    }
    redondear(s, modo) {            // quantize
      if (s >= this.s) return new Dec(this.al(s), s);
      const p = P10(this.s - s); let q = this.i / p; const r = this.i % p;
      if (r !== 0n) {
        const neg = this.i < 0n, ar = r < 0n ? -r : r, dos = ar * 2n;
        let sube = false;
        if (modo === 'HALF_UP') sube = dos >= p;
        else if (modo === 'HALF_EVEN') sube = dos > p || (dos === p && (q % 2n !== 0n));
        else if (modo === 'CEILING') sube = !neg;
        else if (modo === 'FLOOR') sube = neg;
        if (sube) q += neg ? -1n : 1n;
      }
      return new Dec(q, s);
    }
    cmp(o) { o = Dec.de(o); const s = Math.max(this.s, o.s), a = this.al(s), b = o.al(s); return a < b ? -1 : a > b ? 1 : 0; }
    get cero() { return this.i === 0n; }
    toString() {
      const neg = this.i < 0n; let t = (neg ? -this.i : this.i).toString();
      if (this.s > 0) { t = t.padStart(this.s + 1, '0'); t = t.slice(0, -this.s) + '.' + t.slice(-this.s); }
      return (neg ? '-' : '') + t;
    }
  }
  const d = x => Dec.de(x);
  const max = (a, b) => (d(a).cmp(b) >= 0 ? d(a) : d(b));

  // ---------- dinero.py ----------
  const gs = x => Number(d(x).redondear(0, 'HALF_UP').i);
  const trunc2 = x => d(x).redondear(2, 'DOWN');
  const techo = (x, paso) => { paso = d(paso); return d(x).entre(paso).redondear(0, 'CEILING').por(paso); };
  function fmt(x, dec = 0) {
    let v = d(x); const neg = v.i < 0n;
    if (neg) v = new Dec(-v.i, v.s);
    v = v.redondear(dec, 'HALF_UP');
    const t = v.toString(), [ent, fr = ''] = t.split('.');
    const e = ent.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return (neg ? '-' : '') + e + (dec ? ',' + fr.padEnd(dec, '0') : '');
  }

  // ---------- tributos.py ----------
  const seguroDe = (fob, pct = '1') => trunc2(d(fob).por(pct).entre(100));
  function tributos(fob, flete, cambio, itemsSA = [], seguro = null, seguroPct = '1') {
    fob = d(fob); flete = d(flete); cambio = d(cambio);
    const seg = seguro == null ? seguroDe(fob, seguroPct) : d(seguro);
    const cif = fob.mas(flete).mas(seg);
    const imp = gs(cif.por(cambio));
    const daItems = itemsSA.map(it => {
      const f = d(it.fob);
      const base = f.mas(trunc2(flete.por(f).entre(fob))).mas(trunc2(seg.por(f).entre(fob)));
      return gs(d(gs(base.por(cambio))).por(it.pct).entre(100));
    });
    const da = daItems.reduce((a, b) => a + b, 0);
    const val = gs(d(imp).por('0.005'));
    const base = imp + val + da;
    const ire = gs(d(base).por('0.004'));
    const iva = gs(d(base).por('0.10'));
    return { fob, flete, seguro: seg, cif, imponible: imp, da, val, ire, iva, total: da + val + ire + iva, daItems };
  }
  const fleteReales = (fleteUsd, cambioUsd, cambioReal) => d(fleteUsd).por(cambioUsd).entre(cambioReal).redondear(2, 'HALF_EVEN');

  // ---------- tasa_annp.py ----------
  const TARIFAS = {
    tramos: [[d(20000), d('0.50'), 'confirmado'], [d(50000), d('0.475'), 'confirmado'],
             [d(100000), d('0.45'), 'supuesto'], [d(200000), d('0.40'), 'confirmado']],
    IC04: { ton: 2000, paso: d('0.1'), remolque: 20000, bascula: 20000, estac: 20000 },
    IM05: { ton: 3500, paso: d('0.5'), minimo: d(1), camion: 15000, fleteCamion: d(30) },
    sofia: 10644,
  };
  function tasaANNP(regimen, imponible, cambioUsd, kiloNeto = 0, kiloBruto = 0, flete = 0, dias = 1, t = TARIFAS) {
    imponible = Number(imponible); cambioUsd = d(cambioUsd);
    const v = d(imponible).entre(cambioUsd);
    const tr = t.tramos.find(x => v.cmp(x[0]) <= 0) || null;
    const r = { valorUsd: v, pct: tr ? tr[1] : null, estado: tr ? tr[2] : 'sin dato', lineas: [] };
    r.decreto = tr ? gs(d(imponible).por(r.pct).entre(100)) : 0;
    r.lineas.push(['Importación decreto', tr ? `${fmt(r.pct, r.pct.por(1000).redondear(0, 'DOWN').i % 10n ? 3 : 2)} % de ${fmt(imponible)}` : `sin tramo para USD ${fmt(v)}`, r.decreto]);
    if (regimen === 'IM05') {
      const p = t.IM05;
      const tn = max(p.minimo, techo(d(kiloNeto).entre(1000), p.paso));
      const cam = Math.max(1, gs(d(flete).entre(p.fleteCamion)));
      r.lineas.push(['Mercadería', `${fmt(tn, 1)} t (neto) × ${fmt(p.ton)}`, gs(tn.por(p.ton))],
                    ['Acceso camión', `${cam} × ${fmt(p.camion)} (flete ÷ 30)`, cam * p.camion]);
    } else {
      const p = t.IC04;
      const tn = techo(d(kiloBruto).entre(1000), p.paso);
      r.lineas.push(['Mercadería', `${fmt(tn, 1)} t (bruto) × ${fmt(p.ton)}`, gs(tn.por(p.ton))],
                    ['Acceso remolque', `1 × ${fmt(p.remolque)}`, p.remolque], ['Báscula', `1 × ${fmt(p.bascula)}`, p.bascula]);
      if (dias > 1) r.lineas.push(['Estacionamiento', `${dias - 1} día${dias > 2 ? 's' : ''} extra × ${fmt(p.estac)}`, (dias - 1) * p.estac]);
    }
    r.servicios = r.lineas.slice(1).reduce((a, x) => a + x[2], 0);
    r.ivaAnnp = gs(d(r.decreto).entre(10)) + gs(d(r.servicios).entre(10));
    r.factura = r.decreto + r.servicios + r.ivaAnnp;
    r.redBancaria = Number(cambioUsd.entre('1.1').redondear(0, 'DOWN').i);   // int(): trunca
    r.sofia = t.sofia;
    r.ivaOtros = gs(d(r.redBancaria).entre(10)) + gs(d(r.sofia).entre(10));
    r.total = r.factura + r.redBancaria + r.sofia + r.ivaOtros;
    return r;
  }

  // ---------- honorarios.py ----------
  const ESCALA = [
    [d(1000), 15000, d('0.60'), 'supuesto'],
    [d(3000), 75000, d('0.30'), 'confirmado'],
    [d(18000), 225000, d('0.24'), 'confirmado'],
    [d(60000), 465000, d('0.15'), 'confirmado'],
    [null, 840000, d('0.09'), 'confirmado'],
  ];
  function honorario(imponible, cambioUsd, escala = ESCALA) {
    const imp = d(Math.trunc(Number(imponible)));
    const v = imp.entre(cambioUsd);
    const tr = escala.find(x => x[0] == null || v.cmp(x[0]) <= 0);
    const h = gs(d(tr[1]).mas(imp.por(tr[2]).entre(100)));
    return { honorario: h, iva: gs(d(h).entre(10)), tramo: tr, valorUsd: v };
  }

  // ---------- whatsapp.py ----------
  const DESPACHANTE = 'Despachante: Ilse Gonzalez: Ruc:24546488';
  function mensaje(aduana, importador, facturas, crt, impuestos, total = null) {
    const imp = fmt(impuestos);
    const W = Math.max(10, imp.length, total ? fmt(total).length : 0);
    const filas = ['Impuestos:   ' + imp.padStart(W)];
    if (total) {
      filas.push('Honorarios:  ' + fmt(total - impuestos).padStart(W));
      filas.push(' '.repeat(14) + '-'.repeat(W - 1));
      filas.push('Total:       ' + fmt(total).padStart(W));
    }
    if (Array.isArray(facturas)) facturas = facturas.join(' / ');
    return `Aduana: ${aduana}\n${DESPACHANTE}\nImportador: ${importador}\n` +
           `Factura: ${facturas}\nCrt: ${crt}\n\`\`\`` + filas.join('\n') + '```';
  }

  // ---------- calculo.py ----------
  function tasa(reg, imponible, usd, neto = 0, bruto = 0, flete = 0, dias = 1, t = TARIFAS) {
    const r = tasaANNP(reg, imponible, d(usd), d(neto || 0), d(bruto || 0), d(flete || 0), Math.trunc(Number(dias)), t);
    return { vusd: r.valorUsd, pct: r.pct, est: { confirmado: 'ok', supuesto: 'sup' }[r.estado] || 'sin', lineas: r.lineas,
             annp: r.decreto + r.servicios, decreto: r.decreto, servicios: r.servicios, ivaAnnp: r.ivaAnnp, factura: r.factura,
             red: r.redBancaria, sofia: r.sofia, ivaOtros: r.ivaOtros, total: r.total };
  }
  function alcanza(total, tasa_, canon, iva, subcuenta, saldoCanon, saldoIva) {
    const fila = (necesita, hay) => ({ hay, falta: hay == null ? null : Math.max(0, necesita - hay) });
    const f = { total: fila(total, subcuenta), canon: fila(canon, saldoCanon),
                tasa: fila(tasa_, saldoCanon == null ? null : Math.max(0, saldoCanon - canon)), iva: fila(iva, saldoIva) };
    return { ...f, falta: Object.values(f).reduce((a, x) => a + (x.falta || 0), 0) };
  }
  // Kilos de la pantalla: sin decimales, con punto de miles ('17.900' son 17.900 kg)
  function kilos(x) { const s = String(x || '').trim(); return d(s.includes(',') ? s : s.replace(/\./g, '')); }

  /* Cálculo rápido (14.23). c: datos de la pantalla. canon: el del IC04 (2,5 jornales).
     IM05: factura y flete en reales, canon ½ jornal (quinta parte del IC04), tasa por kilo neto y camiones. */
  function rapido(c, seguroPct = '1', canon = 0, tarifas = TARIFAS, escala = ESCALA) {
    const im05 = c.reg === 'IM05';
    if (im05) canon = gs(d(canon).entre(5));
    const cu = d(c.cusd || 0), cr = d(c.creal || 0);
    const cam = im05 || c.mon === 'REAL' ? cr : cu;
    const fob = d(c.valor || 0); let flete = d(c.flete || 0);
    if (!im05 && c.mon === 'REAL' && c.fleteUsd && !cr.cero) flete = fleteReales(c.fleteUsd, cu, cr);
    const vacio = { fob: d(0), flete, seg: d(0), cif: d(0), imp: 0, da: 0, val: 0, ire: 0, iva: 0, total: 0, T: null, H: null, canon, cam };
    if (fob.cero || cam.cero || cu.cero) return vacio;
    const seg = (c.segAuto ?? true) ? null : d(c.seguro || 0);
    const sf = d(c.saFob || 0), sp = d(c.saPct || 0);
    const t = tributos(fob, flete, cam, !sf.cero && !sp.cero ? [{ fob: sf, pct: sp }] : [], seg, seguroPct);
    const r = { fob, flete: t.flete, seg: t.seguro, cif: t.cif, imp: t.imponible, da: t.da, val: t.val, ire: t.ire, iva: t.iva,
                total: t.total, canon, cam };
    r.T = im05 ? tasa('IM05', t.imponible, cu, kilos(c.neto), 0, flete, 1, tarifas)
               : tasa('IC04', t.imponible, cu, 0, kilos(c.bruto), 0, Math.max(1, Math.trunc(Number(c.dias || 1))), tarifas);
    const h = honorario(t.imponible, cu, escala);
    r.H = { h: h.honorario, iva: h.iva, vusd: h.valorUsd };
    return r;
  }

  const N = { Dec, d, gs, trunc2, techo, fmt, seguroDe, tributos, fleteReales, TARIFAS, tasaANNP, ESCALA, honorario,
              DESPACHANTE, mensaje, tasa, alcanza, kilos, rapido };
  if (typeof module !== 'undefined' && module.exports) module.exports = N; else raiz.Nucleo = N;
})(typeof window !== 'undefined' ? window : globalThis);
