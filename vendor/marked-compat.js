/*!
 * marked-compat.js — Drop-in replacement for marked.js (API-compatible subset)
 * Supports: headings, paragraphs, bold, italic, code, fenced code blocks,
 *           blockquotes, ordered/unordered lists, tables (GFM), hr, links, images.
 * API: marked.setOptions({breaks, gfm}), marked.parse(markdown) → html string
 */
(function (global) {
  'use strict';

  var _opts = { breaks: false, gfm: true };

  /* ── Helpers ─────────────────────────────────────────── */
  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ── Inline parser ───────────────────────────────────── */
  function inline(text) {
    // Escape raw HTML-like angle brackets that aren't tags
    // Bold + italic
    text = text.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    text = text.replace(/___(.+?)___/g, '<strong><em>$1</em></strong>');
    // Bold
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/__(.+?)__/g, '<strong>$1</strong>');
    // Italic
    text = text.replace(/\*([^\*\n]+?)\*/g, '<em>$1</em>');
    text = text.replace(/_([^_\n]+?)_/g, '<em>$1</em>');
    // Strikethrough
    text = text.replace(/~~(.+?)~~/g, '<del>$1</del>');
    // Inline code (do after bold/italic to avoid conflicts)
    text = text.replace(/`([^`]+)`/g, function (_, code) {
      return '<code>' + esc(code) + '</code>';
    });
    // Images before links
    text = text.replace(/!\[([^\]]*)\]\(([^\)]+)\)/g, '<img src="$2" alt="$1">');
    // Links
    text = text.replace(/\[([^\]]+)\]\(([^\)]+)\)/g, '<a href="$2">$1</a>');
    // Hard line breaks: two spaces + newline OR backslash + newline
    text = text.replace(/  \n/g, '<br>\n');
    text = text.replace(/\\\n/g, '<br>\n');
    // Soft line breaks (when breaks:true)
    if (_opts.breaks) {
      text = text.replace(/([^\n>])\n(?=[^\n])/g, '$1<br>\n');
    }
    return text;
  }

  /* ── Block parser ────────────────────────────────────── */
  function block(md) {
    var out = '';
    var lines = md.split('\n');
    var i = 0;

    function peek() { return i < lines.length ? lines[i] : null; }
    function consume() { return lines[i++]; }

    while (i < lines.length) {
      var line = peek();

      // Blank line
      if (line.trim() === '') { consume(); continue; }

      // Fenced code block ```
      if (/^(`{3,}|~{3,})/.test(line)) {
        var fence = line.match(/^(`{3,}|~{3,})/)[1];
        var lang = line.slice(fence.length).trim();
        consume();
        var codeLines = [];
        while (i < lines.length && !lines[i].startsWith(fence)) {
          codeLines.push(lines[i]);
          i++;
        }
        if (i < lines.length) consume(); // closing fence
        out += '<pre><code' + (lang ? ' class="language-' + esc(lang) + '"' : '') + '>' +
          esc(codeLines.join('\n')) + '</code></pre>\n';
        continue;
      }

      // Blockquote
      if (/^>\s?/.test(line)) {
        var bqLines = [];
        while (i < lines.length && /^>\s?/.test(lines[i])) {
          bqLines.push(lines[i].replace(/^>\s?/, ''));
          i++;
        }
        out += '<blockquote>' + block(bqLines.join('\n')) + '</blockquote>\n';
        continue;
      }

      // ATX Heading
      var hm = line.match(/^(#{1,6})\s+(.+?)(?:\s+#+)?$/);
      if (hm) {
        consume();
        var lvl = hm[1].length;
        out += '<h' + lvl + '>' + inline(hm[2].trim()) + '</h' + lvl + '>\n';
        continue;
      }

      // Setext heading (underline style)
      if (i + 1 < lines.length) {
        var nextLine = lines[i + 1];
        if (/^={3,}\s*$/.test(nextLine)) {
          out += '<h1>' + inline(line.trim()) + '</h1>\n';
          i += 2; continue;
        }
        if (/^-{3,}\s*$/.test(nextLine) && line.trim() !== '') {
          out += '<h2>' + inline(line.trim()) + '</h2>\n';
          i += 2; continue;
        }
      }

      // Horizontal rule (must come before list check for -)
      if (/^(\*{3,}|-{3,}|_{3,})\s*$/.test(line.trim())) {
        consume();
        out += '<hr>\n';
        continue;
      }

      // Unordered list
      if (/^[-*+]\s/.test(line)) {
        out += '<ul>\n';
        var listIndent = line.match(/^([-*+])\s/)[0].length;
        while (i < lines.length && /^[-*+]\s/.test(lines[i])) {
          var item = lines[i].slice(listIndent).trimEnd();
          consume();
          // Collect continuation lines
          while (i < lines.length && /^\s{2,}/.test(lines[i])) {
            item += '\n' + lines[i].replace(/^\s{2}/, '');
            consume();
          }
          // If item contains a newline it's a loose list item
          var itemHtml = item.indexOf('\n') >= 0
            ? block(item)
            : '<p>' + inline(item) + '</p>';
          // Unwrap single <p> for tight lists
          itemHtml = itemHtml.replace(/^<p>([\s\S]*?)<\/p>\n?$/, '$1');
          out += '<li>' + itemHtml + '</li>\n';
        }
        out += '</ul>\n';
        continue;
      }

      // Ordered list
      if (/^\d+\.\s/.test(line)) {
        out += '<ol>\n';
        while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
          var oitem = lines[i].replace(/^\d+\.\s/, '').trimEnd();
          consume();
          while (i < lines.length && /^\s{3,}/.test(lines[i])) {
            oitem += '\n' + lines[i].replace(/^\s{3}/, '');
            consume();
          }
          var ohtml = oitem.indexOf('\n') >= 0 ? block(oitem) : inline(oitem);
          out += '<li>' + ohtml + '</li>\n';
        }
        out += '</ol>\n';
        continue;
      }

      // GFM Table
      if (_opts.gfm && /\|/.test(line) && i + 1 < lines.length && /^[\|\-\:\s]+$/.test(lines[i + 1])) {
        var headerCells = line.replace(/^\||\|$/g, '').split('|').map(function (s) { return s.trim(); });
        var sepLine = lines[i + 1];
        var aligns = sepLine.replace(/^\||\|$/g, '').split('|').map(function (s) {
          s = s.trim();
          if (/^:-+:$/.test(s)) return 'center';
          if (/^-+:$/.test(s)) return 'right';
          if (/^:-+$/.test(s)) return 'left';
          return '';
        });
        i += 2;
        out += '<table>\n<thead>\n<tr>\n';
        headerCells.forEach(function (h, ci) {
          var align = aligns[ci] ? ' style="text-align:' + aligns[ci] + '"' : '';
          out += '<th' + align + '>' + inline(h) + '</th>\n';
        });
        out += '</tr>\n</thead>\n<tbody>\n';
        while (i < lines.length && /\|/.test(lines[i]) && lines[i].trim() !== '') {
          var rowCells = lines[i].replace(/^\||\|$/g, '').split('|').map(function (s) { return s.trim(); });
          i++;
          out += '<tr>\n';
          rowCells.forEach(function (c, ci) {
            var align = (aligns[ci]) ? ' style="text-align:' + aligns[ci] + '"' : '';
            out += '<td' + align + '>' + inline(c) + '</td>\n';
          });
          out += '</tr>\n';
        }
        out += '</tbody>\n</table>\n';
        continue;
      }

      // Paragraph: collect until blank line or block element
      var paraLines = [];
      while (i < lines.length) {
        var pl = lines[i];
        if (pl.trim() === '') break;
        if (/^#{1,6}\s/.test(pl)) break;
        if (/^(`{3,}|~{3,})/.test(pl)) break;
        if (/^>\s?/.test(pl)) break;
        if (/^(\*{3,}|-{3,}|_{3,})\s*$/.test(pl.trim())) break;
        if (/^[-*+]\s/.test(pl)) break;
        if (/^\d+\.\s/.test(pl)) break;
        paraLines.push(pl);
        i++;
      }
      if (paraLines.length) {
        out += '<p>' + inline(paraLines.join('\n').trim()) + '</p>\n';
      }
    }

    return out;
  }

  /* ── Public API (matches marked.js) ─────────────────── */
  var marked = {
    setOptions: function (opts) {
      if (opts) Object.assign(_opts, opts);
    },
    parse: function (src) {
      if (typeof src !== 'string') return '';
      return block(src);
    }
  };

  // CommonJS / browser global
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = marked;
  } else {
    global.marked = marked;
  }

}(typeof window !== 'undefined' ? window : this));
