# Codec License Analysis for Seq2Vid

This document outlines the licensing requirements for each codec used in Seq2Vid and their compatibility with commercial distribution under the MIT license.

## Summary

⚠️ **CRITICAL ISSUES FOUND**: Several codecs require commercial licenses or have GPL restrictions that conflict with MIT-licensed proprietary distribution.

---

## Codec-by-Codec Analysis

### 1. **DNxHD / DNxHR** ⚠️ LICENSE REQUIRED
- **License**: Proprietary (Avid)
- **Status**: ❌ **Requires commercial license from Avid**
- **Details**: 
  - Avid's proprietary codec format
  - Commercial use requires licensing from Avid
  - Contact Avid directly for licensing: https://www.avid.com/
- **Recommendation**: 
  - **Option A**: Remove DNxHD/DNxHR support
  - **Option B**: Obtain commercial license from Avid
  - **Option C**: Add disclaimer that users must have licensed DNxHD support

---

### 2. **Apple ProRes (ProRes 4444, ProRes 422)** ⚠️ LICENSE REQUIRED
- **License**: Proprietary (Apple)
- **Status**: ❌ **Requires commercial license from Apple**
- **Details**:
  - Apple's proprietary codec
  - Commercial encoding/decoding requires Apple ProRes certification
  - Contact: ProRes@apple.com
  - FFmpeg's ProRes implementation is unauthorized and may have compatibility issues
- **Recommendation**:
  - **Option A**: Remove ProRes support
  - **Option B**: Obtain ProRes certification from Apple (expensive, requires approval)
  - **Option C**: Add disclaimer that ProRes encoding is experimental/unofficial

---

### 3. **H.264 (libx264)** ⚠️ GPL OR COMMERCIAL LICENSE REQUIRED
- **License**: GNU GPL v2 OR Commercial License
- **Status**: ⚠️ **GPL conflicts with MIT for proprietary distribution**
- **Details**:
  - Default license: GPL v2 (requires source code release)
  - Commercial license available from x264, LLC
  - If using GPL version: Your entire app must be GPL (conflicts with MIT)
  - Patent licensing: H.264 patents may require MPEG-LA licensing (separate issue)
- **Recommendation**:
  - **Option A**: Remove H.264 support
  - **Option B**: Purchase commercial license from x264, LLC
  - **Option C**: Release entire app under GPL (not compatible with MIT)

---

### 4. **H.265 / HEVC (libx265)** ⚠️ GPL OR COMMERCIAL LICENSE REQUIRED
- **License**: GNU GPL v2 OR Commercial License
- **Status**: ⚠️ **GPL conflicts with MIT for proprietary distribution**
- **Details**:
  - Default license: GPL v2 (requires source code release)
  - Commercial license available from x265 developers
  - If using GPL version: Your entire app must be GPL (conflicts with MIT)
  - Patent licensing: HEVC patents require licensing from HEVC Advance or MPEG-LA
- **Recommendation**:
  - **Option A**: Remove H.265 support
  - **Option B**: Purchase commercial license from x265 developers
  - **Option C**: Release entire app under GPL (not compatible with MIT)

---

### 5. **CineForm (cfhd)** ✅ FREE FOR COMMERCIAL USE
- **License**: Open Source (GoPro)
- **Status**: ✅ **Free for commercial use**
- **Details**:
  - GoPro open-sourced CineForm in 2017
  - No licensing fees required
  - Standardized as SMPTE VC-5
  - Safe for MIT-licensed commercial distribution
- **Recommendation**: ✅ **Safe to use**

---

### 6. **AV1 (libaom-av1)** ✅ FREE FOR COMMERCIAL USE (with caveats)
- **License**: BSD 2-Clause License
- **Status**: ✅ **Free for commercial use**
- **Details**:
  - BSD 2-Clause is permissive and MIT-compatible
  - AOMedia Patent License 1.0 (royalty-free)
  - **Caveat**: Some third parties (e.g., Sisvel) claim AV1 patents may require separate licensing
  - Generally considered safe for commercial use
- **Recommendation**: ✅ **Safe to use** (but monitor patent landscape)

---

## FFmpeg License Considerations

- **FFmpeg Core**: LGPL v2.1+ (allows proprietary linking)
- **With GPL Codecs**: If libx264/libx265 are enabled, entire FFmpeg becomes GPL
- **Recommendation**: 
  - Use FFmpeg with LGPL-only codecs (CineForm, AV1)
  - OR ensure FFmpeg is dynamically linked (LGPL requirement)
  - OR exclude GPL codecs entirely

---

## Recommended Actions

### ✅ **SAFE TO KEEP** (MIT-Compatible):
1. **CineForm** - Open source, free commercial use
2. **AV1** - BSD license, free commercial use

### ⚠️ **REQUIRES ACTION**:
1. **DNxHD/DNxHR** - Remove OR obtain Avid license
2. **ProRes** - Remove OR obtain Apple certification
3. **H.264** - Remove OR purchase commercial license OR go GPL
4. **H.265** - Remove OR purchase commercial license OR go GPL

---

## Recommended Solution

### Option 1: **Remove Problematic Codecs** (Simplest)
Keep only:
- ✅ CineForm
- ✅ AV1

Remove:
- ❌ DNxHD/DNxHR
- ❌ ProRes
- ❌ H.264
- ❌ H.265

**Pros**: Fully MIT-compliant, no licensing costs
**Cons**: Fewer format options

---

### Option 2: **Add Disclaimers** (Risky)
Keep all codecs but add clear disclaimers:
- "DNxHD/DNxHR encoding requires Avid license"
- "ProRes encoding is experimental/unofficial"
- "H.264/H.265 encoding may require commercial licenses"

**Pros**: More format options
**Cons**: Legal risk, user confusion

---

### Option 3: **Obtain Commercial Licenses** (Expensive)
Purchase licenses for:
- Avid DNxHD/DNxHR
- Apple ProRes
- x264 commercial license
- x265 commercial license

**Pros**: Full format support, legally compliant
**Cons**: Significant cost (likely $10,000+ annually)

---

### Option 4: **Dual License** (Complex)
- Release under GPL for open-source users
- Offer commercial license for proprietary use

**Pros**: Flexible licensing
**Cons**: Complex to manage, may conflict with MIT

---

## Patent Considerations

Even with codec licenses, video codecs may have separate patent licensing requirements:

- **H.264**: MPEG-LA patent pool (may require licensing)
- **H.265**: HEVC Advance / MPEG-LA patent pools (definitely requires licensing)
- **AV1**: AOMedia patent license (royalty-free, but some third parties claim patents)
- **CineForm**: No known patent issues
- **ProRes**: Apple patents (covered by Apple license)
- **DNxHD**: Avid patents (covered by Avid license)

---

## Conclusion

**For MIT-licensed commercial distribution, the safest approach is:**

1. ✅ Keep: CineForm, AV1
2. ❌ Remove: DNxHD, DNxHR, ProRes, H.264, H.265

This ensures full MIT license compatibility without additional licensing costs or legal risks.

---

## References

- [FFmpeg Legal](https://ffmpeg.org/legal.html)
- [x264 Licensing](https://x264.org/licensing/)
- [x265 Licensing](https://x265.org/licensing/)
- [Apple ProRes](https://support.apple.com/en-us/HT200321)
- [GoPro CineForm Open Source](https://gopro.com/en/us/news/gopro-open-sources-the-cineform-codec)
- [AOMedia AV1](https://aomedia.org/)

---

**Last Updated**: December 2024
**Disclaimer**: This is not legal advice. Consult with a lawyer for your specific situation.
