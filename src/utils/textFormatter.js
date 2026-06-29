module.exports = {
  formatCute(text, style, emoji) {
    if (!text) return '';
    let lowerText = text.toLowerCase();
    let result = lowerText;

    // 1. True Wide Style: ｇａｍｉｎｇ
    if (style === 'wide') {
      const wideMap = {
        a:'ａ',b:'ｂ',c:'ｃ',d:'ｄ',e:'ｅ',f:'ｆ',g:'ｇ',h:'ｈ',i:'ｉ',j:'ｊ',k:'ｋ',l:'ｌ',m:'ｍ',
        n:'ｎ',o:'ｏ',p:'ｐ',q:'ｑ',r:'ｒ',s:'ｓ',t:'ｔ',u:'ｕ',v:'ｖ',w:'ｗ',x:'ｘ',y:'ｙ',z:'ｚ',
        '-':'－','_':'＿' 
      };
      result = lowerText.split('').map(char => wideMap[char] || char).join('');
    } 
    // 2. Small Caps Style: ɢᴀᴍɪɴɢ (Fixed 'a' typo and handles hyphen string variations)
    else if (style === 'smallcaps' || style === 'small-caps') {
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

    return emoji ? emoji + ' ' + result : result;
  }
};
