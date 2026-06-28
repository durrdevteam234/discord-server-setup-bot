module.exports = {
  formatCute(text, style, emoji) {
    let lowerText = text.toLowerCase();
    let result = lowerText;

    // 1. Wide Style: g a m i n g
    if (style === 'wide') {
      result = lowerText.split('').join(' ');
    } 
    // 2. Small Caps Style: ɢᴀᴍɪɴɢ
    else if (style === 'smallcaps') {
      const smallCapsMap = {
        a:'ᴀ',b:'ʙ',c:'ᴄ',d:'ᴅ',e:'ᴇ',f:'ꜰ',g:'ɢ',h:'ʜ',i:'ɪ',j:'ᴊ',k:'ᴋ',l:'ʟ',m:'ᴍ',
        n:'ɴ',o:'ᴏ',p:'ᴘ',q:'ǫ',r:'ʀ',s:'s',t:'ᴛ',u:'ᴜ',v:'ᴠ',w:'ᴡ',x:'x',y:'ʏ',z:'ᴢ'
      };
      result = lowerText.split('').map(char => smallCapsMap[char] || char).join('');
    } 
    // 3. Bubbles Style: ⓖⓐⓜⓘⓝⓖ
    else if (style === 'bubbles') {
      const bubblesMap = {
        a:'ⓐ',b:'ⓑ',c:'ⓒ',d:'ⓓ',e:'ⓔ',f:'ⓕ',g:'ⓖ',h:'ⓗ',i:'ⓘ',j:'ⓙ',k:'ⓚ',l:'ⓛ',m:'ⓜ',
        n:'ⓝ',o:'ⓞ',p:'ⓟ',q:'ⓠ',r:'ⓡ',s:'ⓢ',t:'ⓣ',u:'ⓤ',v:'ⓥ',w:'ⓦ',x:'ⓧ',y:'ⓨ',z:'ⓩ'
      };
      result = lowerText.split('').map(char => bubblesMap[char] || char).join('');
    }

    // Combine with the icon decoration layout
    return emoji ? emoji + ' ' + result : result;
  }
};
