# Third-party notices

Goo depends on the third-party software identified below. License links are
pinned to the source revision or release used by Goo.

## G# runtime support

Goo's Linux bundle redistributes `Gsharp.Extensions.dll` from
Gsharp.NET.Sdk 0.3.633.

- Copyright (c) 2019 David Obando.
- License: MIT.
- [G# license](https://github.com/DavidObando/gsharp/blob/f5642aff1598630710f29737baf3416273b0dcf4/LICENSE)

## Yoga.Net 3.2.3, based on Meta Yoga v3.2.1

Goo ships one vendored C# Yoga implementation. `3.2.3` is the Yoga.Net port
version. `v3.2.1` is the Meta Yoga source and behavior baseline for that port.

- Yoga.Net port: Copyright (c) 2026 Chen Ren Song.
- Vendored Yoga.Net license: Copyright (c) Meta Platforms, Inc. and its affiliates.
- Meta Yoga v3.2.1 license: Copyright (c) Facebook, Inc. and its affiliates.
- License: MIT.
- [Vendored Yoga.Net license](https://github.com/chenrensong/Yoga.Net/blob/baf14fcd6cbf21d8930a297e32ef3b76674c37bd/LICENSE)
- [Meta Yoga v3.2.1 license](https://github.com/facebook/yoga/blob/v3.2.1/LICENSE)
- Vendored revision: `baf14fcd6cbf21d8930a297e32ef3b76674c37bd`.
- Goo carries local performance patches. Those changes are Goo modifications,
  not an upstream Yoga.Net release.

## SkiaSharp, HarfBuzzSharp, Skia, and HarfBuzz

- SkiaSharp 3.116.0 and SkiaSharp.HarfBuzz 3.116.0: Copyright (c) 2015-2016
  Xamarin, Inc. and Copyright (c) 2017-2018 Microsoft Corporation. License: MIT.
- HarfBuzzSharp 8.3.1.1 and HarfBuzzSharp.NativeAssets.Linux 8.3.1.1: Copyright
  (c) 2015-2016 Xamarin, Inc. and Copyright (c) 2017-2018 Microsoft Corporation.
  License: MIT.
- Skia m116: Copyright (c) 2011 Google Inc. All rights reserved. License: BSD
  3-Clause.
- HarfBuzz 8.3.1: Old MIT license.
- [SkiaSharp 3.116.0 license](https://github.com/mono/SkiaSharp/blob/810ce1756977211d81a69c1e7b243e80666c99be/LICENSE.md)
- [HarfBuzzSharp 8.3.1.1 and native-assets license](https://github.com/mono/SkiaSharp/blob/64f24b1cddb68d30ec0ac6b661964178fc21d5ec/LICENSE.md)
- [Skia m116 license](https://github.com/google/skia/blob/chrome/m116/LICENSE)
- [HarfBuzz 8.3.1 license](https://github.com/harfbuzz/harfbuzz/blob/8.3.1/COPYING)

### Skia BSD 3-Clause license

Copyright (c) 2011 Google Inc. All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

* Redistributions of source code must retain the above copyright notice, this
  list of conditions and the following disclaimer.

* Redistributions in binary form must reproduce the above copyright notice,
  this list of conditions and the following disclaimer in the documentation
  and/or other materials provided with the distribution.

* Neither the name of the copyright holder nor the names of its contributors
  may be used to endorse or promote products derived from this software without
  specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

### HarfBuzz Old MIT license

HarfBuzz is licensed under the so-called "Old MIT" license. Details follow.
For parts of HarfBuzz that are licensed under different licenses see individual
files named COPYING in subdirectories where applicable.

Copyright (c) 2010-2022 Google, Inc.
Copyright (c) 2015-2020 Ebrahim Byagowi
Copyright (c) 2019,2020 Facebook, Inc.
Copyright (c) 2012,2015 Mozilla Foundation
Copyright (c) 2011 Codethink Limited
Copyright (c) 2008,2010 Nokia Corporation and/or its subsidiary(-ies)
Copyright (c) 2009 Keith Stribley
Copyright (c) 2011 Martin Hosken and SIL International
Copyright (c) 2007 Chris Wilson
Copyright (c) 2005,2006,2020,2021,2022,2023 Behdad Esfahbod
Copyright (c) 2004,2007,2008,2009,2010,2013,2021,2022,2023 Red Hat, Inc.
Copyright (c) 1998-2005 David Turner and Werner Lemberg
Copyright (c) 2016 Igalia S.L.
Copyright (c) 2022 Matthias Clasen
Copyright (c) 2018,2021 Khaled Hosny
Copyright (c) 2018,2019,2020 Adobe, Inc.
Copyright (c) 2013-2015 Alexei Podtelezhnikov

For full copyright notices consult the individual files in the package.

Permission is hereby granted, without written agreement and without license or
royalty fees, to use, copy, modify, and distribute this software and its
documentation for any purpose, provided that the above copyright notice and
the following two paragraphs appear in all copies of this software.

IN NO EVENT SHALL THE COPYRIGHT HOLDER BE LIABLE TO ANY PARTY FOR DIRECT,
INDIRECT, SPECIAL, INCIDENTAL, OR CONSEQUENTIAL DAMAGES ARISING OUT OF THE USE
OF THIS SOFTWARE AND ITS DOCUMENTATION, EVEN IF THE COPYRIGHT HOLDER HAS BEEN
ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

THE COPYRIGHT HOLDER SPECIFICALLY DISCLAIMS ANY WARRANTIES, INCLUDING, BUT NOT
LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A
PARTICULAR PURPOSE. THE SOFTWARE PROVIDED HEREUNDER IS ON AN "AS IS" BASIS, AND
THE COPYRIGHT HOLDER HAS NO OBLIGATION TO PROVIDE MAINTENANCE, SUPPORT, UPDATES,
ENHANCEMENTS, OR MODIFICATIONS.

## Hexa.NET.SDL3, HexaGen.Runtime, and SDL

- Hexa.NET.SDL3 1.2.17: Copyright (c) 2024 Juna Meinhold. License: MIT.
- HexaGen.Runtime 1.1.24: Copyright (c) 2023 Juna Meinhold. License: MIT.
- SDL 3.4.0: Copyright (C) 1997-2025 Sam Lantinga. License: zlib.
- [Hexa.NET.SDL3 license](https://github.com/HexaEngine/Hexa.NET.SDL/blob/15fc3406e473759a2bcddd9c3ea24b8006916fbd/LICENSE.txt)
- [HexaGen.Runtime license](https://github.com/HexaEngine/HexaGen/blob/e8cde045ae0b15284cddd8f79b491af4a8afc420/LICENSE.txt)
- [SDL 3.4.0 license](https://github.com/libsdl-org/SDL/blob/release-3.4.0/LICENSE.txt)

Hexa.NET.SDL3 distributes SDL native binaries, but its package license covers
the MIT-licensed wrapper. Goo therefore reproduces SDL's zlib notice directly.

### SDL zlib license

Copyright (C) 1997-2025 Sam Lantinga <slouken@libsdl.org>

This software is provided 'as-is', without any express or implied warranty. In
no event will the authors be held liable for any damages arising from the use
of this software.

Permission is granted to anyone to use this software for any purpose, including
commercial applications, and to alter it and redistribute it freely, subject
to the following restrictions:

1. The origin of this software must not be misrepresented; you must not claim
   that you wrote the original software. If you use this software in a product,
   an acknowledgment in the product documentation would be appreciated but is
   not required.
2. Altered source versions must be plainly marked as such, and must not be
   misrepresented as being the original software.
3. This notice may not be removed or altered from any source distribution.

## Unicode.Bidi

- Unicode.Bidi 0.3.18: Copyright (c) 2006 Erik A. Brandstadmoen. License: MIT.
- [Unicode.Bidi .NET license](https://github.com/erikbra/unicode-bidi-net/blob/14fc0a5d273d2ffdc59dc3e6b2828847dbd1cda9/LICENSE)

Unicode.Bidi ports behavior and generated Unicode data from the Rust
`unicode-bidi` crate version 0.3.18. That upstream work is Copyright The Servo
Project Developers and is offered under either the MIT or Apache-2.0 license.

- [unicode-bidi v0.3.18 MIT license](https://github.com/servo/unicode-bidi/blob/v0.3.18/LICENSE-MIT)
- [unicode-bidi v0.3.18 Apache-2.0 license](https://github.com/servo/unicode-bidi/blob/v0.3.18/LICENSE-APACHE)

## MIT license text

The following terms apply to the MIT-licensed components identified above,
with their respective copyright notices.

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
