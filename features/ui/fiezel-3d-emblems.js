/**
 * FIEZEL 2D VECTOR CRESTS — EXCLUSIVE HERALDIC CLUB EMBLEMS
 * Pure, crisp, high-contrast 2D vector shields and badges inspired by
 * European football championship crests (Premier League, La Liga, Serie A).
 * Flat colors, bold iconography, razor-sharp lines.
 */
(function (global) {
  'use strict';

  var Fiezel3DEmblems = {
    brandCrest: function (size) {
      var s = size || 44;
      return '<svg class="fz-3d-emblem fz-3d-brand" viewBox="0 0 44 44" width="' + s + '" height="' + s + '" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">' +
        /* Neon Lime / Electric Green Athletic Roundel Badge (matching media_1790351730448.png) */
        '<circle cx="22" cy="22" r="21" fill="#CCFF00"/>' +
        '<circle cx="22" cy="22" r="19.5" stroke="#111111" stroke-width="1.2" fill="none"/>' +
        '<path d="M24 7.5L12.5 22.5H19.5L17.5 35.5L29.5 19.5H22.5L24.5 7.5H24Z" fill="#111111"/>' +
      '</svg>';
    },

    chokai: function (size) {
      var s = size || 54;
      return '<svg class="fz-3d-emblem fz-3d-chokai" viewBox="0 0 54 54" width="' + s + '" height="' + s + '" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">' +
        /* 2D Royal Navy & Gold Premier League Audio Shield */
        '<path d="M9 5 C21 3.5 33 3.5 45 5 C46.5 21 43 36 27 50 C11 36 7.5 21 9 5 Z" fill="#FFD700"/>' +
        '<path d="M10.8 7 C21.6 5.8 32.4 5.8 43.2 7 C44.5 21 41.2 34.5 27 47 C12.8 34.5 9.5 21 10.8 7 Z" fill="#0A2540"/>' +
        '<path d="M12.5 8.8 C22 7.8 32 7.8 41.5 8.8 C42.6 21 39.5 33 27 44.5 C14.5 33 11.4 21 12.5 8.8 Z" stroke="#FFD700" stroke-width="0.8" fill="none"/>' +
        /* Flanking Gold Stars */
        '<polygon points="15.5,12 16.3,13.6 18.1,13.8 16.7,15 17.1,16.8 15.5,15.8 13.9,16.8 14.3,15 12.9,13.8 14.7,13.6" fill="#FFD700"/>' +
        '<polygon points="38.5,12 39.3,13.6 41.1,13.8 39.7,15 40.1,16.8 38.5,15.8 36.9,16.8 37.3,15 35.9,13.8 37.7,13.6" fill="#FFD700"/>' +
        /* 2D Audio Headphones */
        '<path d="M17 26 C17 18 21.5 13 27 13 C32.5 13 37 18 37 26" stroke="#FFFFFF" stroke-width="3.2" stroke-linecap="round"/>' +
        '<rect x="14" y="23" width="6.5" height="11" rx="3.2" fill="#38BDF8"/>' +
        '<rect x="15.2" y="24" width="1.8" height="9" rx="0.9" fill="#FFFFFF"/>' +
        '<rect x="33.5" y="23" width="6.5" height="11" rx="3.2" fill="#38BDF8"/>' +
        '<rect x="37" y="24" width="1.8" height="9" rx="0.9" fill="#FFFFFF"/>' +
        /* 2D Equalizer Audio Bars */
        '<rect x="23" y="27" width="2" height="7" rx="1" fill="#38BDF8"/>' +
        '<rect x="26" y="22" width="2" height="12" rx="1" fill="#FFD700"/>' +
        '<rect x="29" y="25" width="2" height="9" rx="1" fill="#38BDF8"/>' +
        /* Base Laurel Garland */
        '<path d="M17 38 C20 41 24 43 27 44 C30 43 34 41 37 38" stroke="#FFD700" stroke-width="1.6" stroke-linecap="round" fill="none"/>' +
        '<circle cx="27" cy="44.2" r="1.6" fill="#FFD700"/>' +
      '</svg>';
    },

    target: function (size) {
      var s = size || 54;
      return '<svg class="fz-3d-emblem fz-3d-target" viewBox="0 0 54 54" width="' + s + '" height="' + s + '" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">' +
        /* 2D Crimson Red & Gold Tournament Shield */
        '<path d="M9 5 C21 3.5 33 3.5 45 5 C46.5 21 43 36 27 50 C11 36 7.5 21 9 5 Z" fill="#FFD700"/>' +
        '<path d="M10.8 7 C21.6 5.8 32.4 5.8 43.2 7 C44.5 21 41.2 34.5 27 47 C12.8 34.5 9.5 21 10.8 7 Z" fill="#C8102E"/>' +
        '<path d="M12.5 8.8 C22 7.8 32 7.8 41.5 8.8 C42.6 21 39.5 33 27 44.5 C14.5 33 11.4 21 12.5 8.8 Z" stroke="#FFD700" stroke-width="0.8" fill="none"/>' +
        /* Crossed Tournament Lances */
        '<line x1="14" y1="13" x2="40" y2="39" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round"/>' +
        '<line x1="40" y1="13" x2="14" y2="39" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round"/>' +
        '<polygon points="14,13 12,17 16,17" fill="#FFD700"/>' +
        '<polygon points="40,13 38,17 42,17" fill="#FFD700"/>' +
        /* 2D Bullseye Target Roundel */
        '<circle cx="27" cy="26" r="12" fill="#FFD700"/>' +
        '<circle cx="27" cy="26" r="9.5" fill="#FFFFFF"/>' +
        '<circle cx="27" cy="26" r="6.8" fill="#C8102E"/>' +
        '<circle cx="27" cy="26" r="3.8" fill="#FFD700"/>' +
        '<circle cx="27" cy="26" r="1.8" fill="#FFFFFF"/>' +
        /* Base Laurel Garland */
        '<path d="M17 38 C20 41 24 43 27 44 C30 43 34 41 37 38" stroke="#FFD700" stroke-width="1.6" stroke-linecap="round" fill="none"/>' +
        '<circle cx="27" cy="44.2" r="1.6" fill="#FFD700"/>' +
      '</svg>';
    },

    kotoba: function (size) {
      var s = size || 54;
      return '<svg class="fz-3d-emblem fz-3d-kotoba" viewBox="0 0 54 54" width="' + s + '" height="' + s + '" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">' +
        /* 2D Celtic Emerald & Gold Tournament Shield */
        '<path d="M9 5 C21 3.5 33 3.5 45 5 C46.5 21 43 36 27 50 C11 36 7.5 21 9 5 Z" fill="#FFD700"/>' +
        '<path d="M10.8 7 C21.6 5.8 32.4 5.8 43.2 7 C44.5 21 41.2 34.5 27 47 C12.8 34.5 9.5 21 10.8 7 Z" fill="#006847"/>' +
        '<path d="M12.5 8.8 C22 7.8 32 7.8 41.5 8.8 C42.6 21 39.5 33 27 44.5 C14.5 33 11.4 21 12.5 8.8 Z" stroke="#A7F3D0" stroke-width="0.8" fill="none"/>' +
        /* Flanking Gold Stars */
        '<polygon points="15.5,12 16.3,13.6 18.1,13.8 16.7,15 17.1,16.8 15.5,15.8 13.9,16.8 14.3,15 12.9,13.8 14.7,13.6" fill="#FFD700"/>' +
        '<polygon points="38.5,12 39.3,13.6 41.1,13.8 39.7,15 40.1,16.8 38.5,15.8 36.9,16.8 37.3,15 35.9,13.8 37.7,13.6" fill="#FFD700"/>' +
        /* 2D Open Book of Lexicon */
        '<path d="M13.5 22 C17.5 20 22.5 21 27 23 C31.5 21 36.5 20 40.5 22 V33 C36.5 31 31.5 32 27 34 C22.5 32 17.5 31 13.5 33 V22 Z" fill="#FFD700"/>' +
        '<path d="M14.5 21 C18.5 19 23 20 26.8 22 V31.5 C23 29.5 18.5 28.5 14.5 30.5 V21 Z" fill="#FFFFFF"/>' +
        '<path d="M27.2 22 C31 20 35.5 19 39.5 21 V30.5 C35.5 28.5 31 29.5 27.2 31.5 V22 Z" fill="#FFFFFF"/>' +
        '<rect x="26.3" y="21" width="1.4" height="11" rx="0.7" fill="#FFD700"/>' +
        '<line x1="17" y1="23.5" x2="24" y2="23.5" stroke="#006847" stroke-width="1" stroke-linecap="round"/>' +
        '<line x1="17" y1="26.5" x2="24" y2="26.5" stroke="#006847" stroke-width="1" stroke-linecap="round"/>' +
        '<line x1="30" y1="23.5" x2="37" y2="23.5" stroke="#006847" stroke-width="1" stroke-linecap="round"/>' +
        '<line x1="30" y1="26.5" x2="37" y2="26.5" stroke="#006847" stroke-width="1" stroke-linecap="round"/>' +
        /* Golden Feather Quill */
        '<path d="M35 15 C33 19 28 26 24 30 L23 31 L24 29 C26 26 31 20 33 16 Z" fill="#FFD700"/>' +
        '<path d="M35 15 C37 13 38 12 39 12 C38 14 36 17 34 18 Z" fill="#FFF9C4"/>' +
        /* Base Laurel Garland */
        '<path d="M17 38 C20 41 24 43 27 44 C30 43 34 41 37 38" stroke="#FFD700" stroke-width="1.6" stroke-linecap="round" fill="none"/>' +
        '<circle cx="27" cy="44.2" r="1.6" fill="#FFD700"/>' +
      '</svg>';
    },

    bunpo: function (size) {
      var s = size || 54;
      return '<svg class="fz-3d-emblem fz-3d-bunpo" viewBox="0 0 54 54" width="' + s + '" height="' + s + '" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">' +
        /* 2D Royal Purple & Gold Serie A Style Shield */
        '<path d="M9 5 C21 3.5 33 3.5 45 5 C46.5 21 43 36 27 50 C11 36 7.5 21 9 5 Z" fill="#FFD700"/>' +
        '<path d="M10.8 7 C21.6 5.8 32.4 5.8 43.2 7 C44.5 21 41.2 34.5 27 47 C12.8 34.5 9.5 21 10.8 7 Z" fill="#4C1D95"/>' +
        '<path d="M12.5 8.8 C22 7.8 32 7.8 41.5 8.8 C42.6 21 39.5 33 27 44.5 C14.5 33 11.4 21 12.5 8.8 Z" stroke="#DDD6FE" stroke-width="0.8" fill="none"/>' +
        /* Athletic Chevrons */
        '<path d="M15 17 L27 25 L39 17 L27 31 Z" fill="#6D28D9"/>' +
        '<path d="M16 23 L27 30 L38 23 L27 36 Z" fill="#FFD700" opacity="0.3"/>' +
        /* 2D High-Voltage Lightning Bolt */
        '<path d="M29 10 L16 25 H24 L22 40 L36 23 H28 L30 10 H29 Z" fill="#FFD700"/>' +
        '<path d="M28 12 L18.5 24 H24.5 L23 37 L33.5 24 H27.5 L29 12 H28 Z" fill="#FFFFFF"/>' +
        /* Flanking Diamond Stars */
        '<polygon points="15,13 16,14.5 17.5,15 16,15.5 15,17 14,15.5 12.5,15 14,14.5" fill="#FFD700"/>' +
        '<polygon points="39,13 40,14.5 41.5,15 40,15.5 39,17 38,15.5 36.5,15 38,14.5" fill="#FFD700"/>' +
        /* Base Laurel Garland */
        '<path d="M17 38 C20 41 24 43 27 44 C30 43 34 41 37 38" stroke="#FFD700" stroke-width="1.6" stroke-linecap="round" fill="none"/>' +
        '<circle cx="27" cy="44.2" r="1.6" fill="#FFD700"/>' +
      '</svg>';
    },

    dokkai: function (size) {
      var s = size || 54;
      return '<svg class="fz-3d-emblem fz-3d-dokkai" viewBox="0 0 54 54" width="' + s + '" height="' + s + '" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">' +
        /* 2D Royal Navy & Gold Academy Shield */
        '<path d="M9 5 C21 3.5 33 3.5 45 5 C46.5 21 43 36 27 50 C11 36 7.5 21 9 5 Z" fill="#FFD700"/>' +
        '<path d="M10.8 7 C21.6 5.8 32.4 5.8 43.2 7 C44.5 21 41.2 34.5 27 47 C12.8 34.5 9.5 21 10.8 7 Z" fill="#1E3A8A"/>' +
        '<path d="M12.5 8.8 C22 7.8 32 7.8 41.5 8.8 C42.6 21 39.5 33 27 44.5 C14.5 33 11.4 21 12.5 8.8 Z" stroke="#93C5FD" stroke-width="0.8" fill="none"/>' +
        /* 2D Rolled Parchment Scroll */
        '<rect x="17" y="13" width="20" height="25" rx="2.5" fill="#FFFBEB" stroke="#FFD700" stroke-width="1"/>' +
        '<line x1="21" y1="18" x2="33" y2="18" stroke="#1E3A8A" stroke-width="1.5" stroke-linecap="round"/>' +
        '<line x1="21" y1="22.5" x2="33" y2="22.5" stroke="#1E3A8A" stroke-width="1.5" stroke-linecap="round"/>' +
        '<line x1="21" y1="27" x2="29" y2="27" stroke="#1E3A8A" stroke-width="1.5" stroke-linecap="round"/>' +
        '<line x1="21" y1="31.5" x2="26" y2="31.5" stroke="#1E3A8A" stroke-width="1.5" stroke-linecap="round"/>' +
        /* Crimson & Gold Wax Seal */
        '<circle cx="32" cy="32" r="3.5" fill="#DC2626" stroke="#FFD700" stroke-width="1"/>' +
        '<circle cx="32" cy="32" r="1.5" fill="#FFD700"/>' +
        /* Base Laurel Garland */
        '<path d="M17 38 C20 41 24 43 27 44 C30 43 34 41 37 38" stroke="#FFD700" stroke-width="1.6" stroke-linecap="round" fill="none"/>' +
        '<circle cx="27" cy="44.2" r="1.6" fill="#FFD700"/>' +
      '</svg>';
    },

    exam: function (size) {
      var s = size || 54;
      return '<svg class="fz-3d-emblem fz-3d-exam" viewBox="0 0 54 54" width="' + s + '" height="' + s + '" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">' +
        /* 2D Champions Cup Gold Shield */
        '<path d="M9 5 C21 3.5 33 3.5 45 5 C46.5 21 43 36 27 50 C11 36 7.5 21 9 5 Z" fill="#FFD700"/>' +
        '<path d="M10.8 7 C21.6 5.8 32.4 5.8 43.2 7 C44.5 21 41.2 34.5 27 47 C12.8 34.5 9.5 21 10.8 7 Z" fill="#121218"/>' +
        '<path d="M12.5 8.8 C22 7.8 32 7.8 41.5 8.8 C42.6 21 39.5 33 27 44.5 C14.5 33 11.4 21 12.5 8.8 Z" stroke="#FFD700" stroke-width="0.8" fill="none"/>' +
        /* 5-Star Crown at Apex */
        '<polygon points="27,10 27.6,11.3 29,11.5 28,12.3 28.3,13.6 27,12.9 25.7,13.6 26,12.3 25,11.5 26.4,11.3" fill="#FFD700"/>' +
        '<polygon points="21,11 21.5,12.1 22.7,12.2 21.8,12.9 22.1,14 21,13.4 19.9,14 20.2,12.9 19.3,12.2 20.5,12.1" fill="#FFD700"/>' +
        '<polygon points="33,11 33.5,12.1 34.7,12.2 33.8,12.9 34.1,14 33,13.4 31.9,14 32.2,12.9 31.3,12.2 32.5,12.1" fill="#FFD700"/>' +
        /* 2D UEFA Champions Trophy */
        '<path d="M18 15 C18 23.5 22.5 26.5 27 26.5 C31.5 26.5 36 23.5 36 15 H18 Z" fill="#FFD700"/>' +
        '<path d="M20 16.5 C20 22 23 24.5 27 24.5 C31 24.5 34 22 34 16.5 H20 Z" fill="#121218"/>' +
        '<path d="M15 16 C15 21.5 18 23.5 20 23.5 V21.5 C18.5 21.5 17 19.8 17 16 H15 Z" fill="#FFD700"/>' +
        '<path d="M39 16 C39 21.5 36 23.5 34 23.5 V21.5 C35.5 21.5 37 19.8 37 16 H39 Z" fill="#FFD700"/>' +
        '<rect x="25.5" y="26.5" width="3" height="6.5" fill="#FFD700"/>' +
        '<rect x="20" y="33" width="14" height="4.5" rx="1.5" fill="#FFD700"/>' +
        /* Base Laurel Garland */
        '<path d="M17 38 C20 41 24 43 27 44 C30 43 34 41 37 38" stroke="#FFD700" stroke-width="1.6" stroke-linecap="round" fill="none"/>' +
        '<circle cx="27" cy="44.2" r="1.6" fill="#FFD700"/>' +
      '</svg>';
    }
  };

  global.Fiezel3DEmblems = Fiezel3DEmblems;
  if (typeof module !== 'undefined' && module.exports) module.exports = Fiezel3DEmblems;
})(typeof globalThis !== 'undefined' ? globalThis : this);
