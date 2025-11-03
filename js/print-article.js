/* js/print-article.js
   Imprime SOLO el título (#art-titulo) y el contenido (#art-contenido),
   dentro de un iframe oculto para máxima compatibilidad (Chrome/Edge/Firefox).
   Sin librerías externas.
*/
(function () {
  // Botón: funciona si usas data-print o el id clásico
  const BTN_SELECTORS = ['[data-print]', '#btn-descargar'];

  function $(sel) { return document.querySelector(sel); }

  // CSS mínimo embebido para impresión pulida (A4, márgenes, tipografía y .prose)
  const PRINT_CSS = `
    @page { size: A4; margin: 15mm 15mm 18mm; }
    html, body {
      background: #fff;
      color: #000;
      font: 11pt/1.5 ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial;
    }
    .wrap {
      padding: 0;
    }
    h1 {
      font-size: 22pt;
      font-weight: 900;
      margin: 0 0 10mm 0;
      line-height: 1.2;
      text-align: justify;
    }
    .prose {
      max-width: none;
      text-align: justify;
      text-justify: inter-word;
      hyphens: auto;
    }
    .prose h2, .prose h3, .prose h4 {
      font-weight: 800;
      margin: 1.1em 0 .4em;
      text-align: justify;
      page-break-after: avoid;
    }
    .prose p, .prose ul, .prose ol, .prose blockquote {
      margin: .7em 0;
      page-break-inside: avoid;
    }
    .prose ul, .prose ol {
      padding-left: 1.1em;
    }
    .prose blockquote {
      border-left: 4px solid #000;
      padding: 8px 12px;
      background: #f6f6f6;
    }
    a { color: #000; text-decoration: underline; }
    img, table { page-break-inside: avoid; }
  `.trim();

  function buildPrintHtml(titleText, contentHtml) {
    // Documento mínimo para el iframe
    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="utf-8">
        <title>${escapeHtml(titleText || 'Artículo')}</title>
        <style>${PRINT_CSS}</style>
      </head>
      <body>
        <div class="wrap">
          <h1>${escapeHtml(titleText || 'Artículo')}</h1>
          <div class="prose">
            ${contentHtml || ''}
          </div>
        </div>
      </body>
      </html>
    `;
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function printViaIframe(titleText, contentHtml) {
    return new Promise((resolve, reject) => {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.setAttribute('aria-hidden', 'true');

      document.body.appendChild(iframe);

      const doc = iframe.contentDocument || iframe.contentWindow.document;
      doc.open();
      doc.write(buildPrintHtml(titleText, contentHtml));
      doc.close();

      // Asegurar que el contenido esté listo antes de imprimir
      const tryPrint = () => {
        try {
          iframe.contentWindow.focus();
          // Pequeño delay ayuda en algunos navegadores
          setTimeout(() => {
            iframe.contentWindow.print();

            // Limpieza tras imprimir; algunos navegadores no disparan afterprint en iframes
            setTimeout(() => {
              if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
              resolve();
            }, 400);
          }, 50);
        } catch (err) {
          if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
          reject(err);
        }
      };

      // onload de iframe no siempre dispara con doc.write; usamos un fallback corto
      // que suele ser suficiente para que el layout esté listo.
      setTimeout(tryPrint, 80);
    });
  }

  function printViaPopup(titleText, contentHtml) {
    // Fallback en ventana nueva
    const html = buildPrintHtml(titleText, contentHtml);
    const w = window.open('', '_blank', 'noopener,noreferrer');
    if (!w) throw new Error('Popup bloqueado');
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => {
      w.print();
      setTimeout(() => { try { w.close(); } catch(_) {} }, 400);
    }, 80);
  }

  function handlePrintClick(e) {
    e.preventDefault();

    const titleEl   = document.getElementById('art-titulo');
    const contentEl = document.getElementById('art-contenido');

    const titleText = titleEl ? (titleEl.textContent || titleEl.innerText || '').trim() : '';
    const contentHtml = contentEl ? contentEl.innerHTML : '';

    if (!contentHtml) {
      alert('No hay contenido del artículo para imprimir.');
      return;
    }

    // Intento principal: iframe oculto
    printViaIframe(titleText, contentHtml).catch(() => {
      // Fallback: ventana emergente
      try {
        printViaPopup(titleText, contentHtml);
      } catch (err) {
        console.error('[print-article] No se pudo imprimir:', err);
        alert('No se pudo abrir el diálogo de impresión en este navegador.');
      }
    });
  }

  function bind() {
    // Vincula al primer botón que exista de la lista
    for (const sel of BTN_SELECTORS) {
      const btn = $(sel);
      if (btn) {
        btn.addEventListener('click', handlePrintClick);
        break;
      }
    }
  }

  document.addEventListener('DOMContentLoaded', bind);
})();
