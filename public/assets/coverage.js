/* Shared collection rules. The future delivery endpoint must enforce the same
   districts server-side before accepting a lead. Postcode prefixes are NOT areas. */
const SCRAPLOCAL_COVERAGE = (() => {
  const districts = Object.freeze(['Birmingham', 'Sandwell', 'Dudley', 'Walsall', 'Wolverhampton']);
  const cache = new Map();
  const normalise = value => value.toUpperCase().replace(/\s/g, '');
  const allowsDistrict = district => districts.includes(district);
  async function check(value) {
    const postcode = normalise(value);
    const cached = cache.get(postcode);
    if (cached && Date.now() - cached.time < 300000) return cached.result;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch('https://api.postcodes.io/postcodes/' + encodeURIComponent(postcode), {signal: controller.signal, credentials: 'omit', referrerPolicy: 'no-referrer'});
      if (response.status === 404) return {ok:false, reason:'invalid', message:'We couldn’t find that postcode. Check it and try again.'};
      if (!response.ok) throw new Error('Lookup unavailable');
      const data = await response.json();
      if (data.status !== 200 || !data.result || typeof data.result.admin_district !== 'string') throw new Error('Incomplete postcode result');
      const district = data.result.admin_district;
      const result = allowsDistrict(district) ? {ok:true, district} : {ok:false, reason:'outside', message:'Sorry, we don’t collect from this postcode yet. We cover Birmingham, Sandwell, Dudley, Walsall and Wolverhampton.'};
      cache.set(postcode, {time:Date.now(), result});
      return result;
    } catch {
      return {ok:false, reason:'unavailable', message:'We couldn’t check the pickup area right now. Please try again. Your details are still here.'};
    } finally { clearTimeout(timeout); }
  }
  return Object.freeze({districts, allowsDistrict, check});
})();
