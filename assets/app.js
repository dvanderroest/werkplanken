/**
 * Mijn Werkplank — Eenvoudige client-side hulpfuncties (geen externe libraries nodig):
 * 1. Tekstgrootte A / A+ / A++ (opgeslagen in localStorage)
 * 2. Modals openen en sluiten (Mijn gegevens, Proef-postvak, App-installatiehulp)
 * 3. Directe zoekfilter op pagina's (Wie is wie, Visiteren, Bouwstukken)
 * 4. Foto's & Loge-emblemen automatisch in de browser verkleinen naar compacte data-URL
 */

(function () {
  // 1. Tekstgrootte herstellen bij laden
  var savedScale = localStorage.getItem('werkplank_font_scale') || 'normal';
  applyScale(savedScale);

  function applyScale(scale) {
    if (scale !== 'normal' && scale !== 'large' && scale !== 'xlarge') {
      scale = 'normal';
    }
    document.documentElement.setAttribute('data-font-scale', scale);
    localStorage.setItem('werkplank_font_scale', scale);
    var btns = document.querySelectorAll('[data-set-scale]');
    btns.forEach(function (b) {
      if (b.getAttribute('data-set-scale') === scale) {
        b.classList.add('active');
      } else {
        b.classList.remove('active');
      }
    });
  }

  document.addEventListener('click', function (e) {
    var scaleBtn = e.target.closest('[data-set-scale]');
    if (scaleBtn) {
      applyScale(scaleBtn.getAttribute('data-set-scale'));
      return;
    }

    var openBtn = e.target.closest('[data-open-modal]');
    if (openBtn) {
      var id = openBtn.getAttribute('data-open-modal');
      var modal = document.getElementById(id);
      if (modal) modal.classList.add('open');
      return;
    }

    var closeBtn = e.target.closest('[data-close-modal]');
    if (closeBtn) {
      var targetId = closeBtn.getAttribute('data-close-modal');
      var m = targetId ? document.getElementById(targetId) : closeBtn.closest('.modal-backdrop');
      if (m) m.classList.remove('open');
      return;
    }

    // Klik buiten het modal-paneel sluit de modal
    if (e.target.classList && e.target.classList.contains('modal-backdrop')) {
      e.target.classList.remove('open');
    }

    // Foto wissen-knop
    var clearImgBtn = e.target.closest('[data-clear-image]');
    if (clearImgBtn) {
      var prefix = clearImgBtn.getAttribute('data-clear-image');
      var hiddenInput = document.getElementById(prefix + '-hidden');
      var previewImg = document.getElementById(prefix + '-preview');
      if (hiddenInput) hiddenInput.value = '';
      if (previewImg) {
        previewImg.src = previewImg.getAttribute('data-placeholder') || '/icon.svg';
      }
    }
  });

  // 2. Live zoeken zonder pagina-herlading (voor Wie is wie, Visiteren, Bouwstukken)
  document.querySelectorAll('[data-filter-target]').forEach(function (input) {
    input.addEventListener('input', function () {
      var targetGroup = input.getAttribute('data-filter-target');
      var q = (input.value || '').trim().toLowerCase();
      document.querySelectorAll('[data-filter-item="' + targetGroup + '"]').forEach(function (item) {
        var hay = (item.getAttribute('data-filter-text') || item.textContent || '').toLowerCase();
        item.style.display = !q || hay.indexOf(q) !== -1 ? '' : 'none';
      });
    });
  });

  // 3. Foto-upload verkleinen & bijsnijden op <canvas> voordat het PHP-formulier wordt opgestuurd
  document.querySelectorAll('[data-image-upload]').forEach(function (fileInput) {
    fileInput.addEventListener('change', function () {
      var file = fileInput.files && fileInput.files[0];
      if (!file) return;

      var prefix = fileInput.getAttribute('data-image-upload');
      var preserveAlpha = fileInput.getAttribute('data-preserve-alpha') === '1';
      var maxSize = parseInt(fileInput.getAttribute('data-max-size') || '280', 10);

      resizeImageFile(file, maxSize, !preserveAlpha, preserveAlpha, function (err, dataUrl) {
        if (err) {
          alert(err);
          return;
        }
        var hidden = document.getElementById(prefix + '-hidden');
        var preview = document.getElementById(prefix + '-preview');
        if (hidden) hidden.value = dataUrl;
        if (preview) preview.src = dataUrl;
      });
      fileInput.value = '';
    });
  });

  function resizeImageFile(file, maxSize, cropSquare, preserveAlpha, cb) {
    if (!file.type || file.type.indexOf('image/') !== 0) {
      return cb('Kies alstublieft een geldige afbeelding (JPG, PNG of WebP).');
    }
    var reader = new FileReader();
    reader.onload = function () {
      var img = new Image();
      img.onload = function () {
        var canvas = document.createElement('canvas');
        var sx = 0, sy = 0, sw = img.width, sh = img.height;
        var dw = maxSize, dh = maxSize;

        if (cropSquare) {
          var side = Math.min(img.width, img.height);
          sx = Math.floor((img.width - side) / 2);
          sy = Math.floor((img.height - side) / 2);
          sw = side;
          sh = side;
        } else {
          var scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
          dw = Math.max(1, Math.round(img.width * scale));
          dh = Math.max(1, Math.round(img.height * scale));
        }

        canvas.width = dw;
        canvas.height = dh;
        var ctx = canvas.getContext('2d');
        if (!preserveAlpha) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, dw, dh);
        }
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, dw, dh);

        var mime = preserveAlpha ? 'image/png' : 'image/jpeg';
        var result = canvas.toDataURL(mime, 0.84);
        cb(null, result);
      };
      img.onerror = function () {
        cb('Deze afbeelding kon niet worden ingeladen.');
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  // 4. PWA Service Worker registratie (uitsluitend voor vaste icoontjes/afbeeldingen)
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker
      .register('/sw.js', { updateViaCache: 'none' })
      .then(function (reg) {
        reg.update();
      })
      .catch(function () {});
  }
})();
