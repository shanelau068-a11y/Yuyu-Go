# Third-party notices

The 600 embedded classic Go problems are adapted from the JSON problem records in [sanderland/tsumego](https://github.com/sanderland/tsumego):

- Maeda Nobuaki — *Newly Selected Tsumego 100 Problems for 1–8k* (100 records)
- Cho Chikun — *Encyclopedia of Life and Death — Advanced* (500 records)

The upstream repository supplies these records under the MIT License. The full upstream copyright and permission notice applies to the embedded data.

Copyright 2020 Sander Land and/or other authors of the content in that repository.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files, to deal in the Software without restriction, including rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies, subject to inclusion of the copyright notice and this permission notice in copies or substantial portions of the Software.

## Go AI engine

The local Go rules and Monte Carlo Tree Search implementation in `go-ai.js` is adapted from [NakliTechie/KoLocal](https://github.com/NakliTechie/KoLocal), Copyright (c) 2026 NakliTechie, under the MIT License. The interface, persistence, sound, Chinese copy, search settings, and integration were adapted for this project.

Human-vs-computer play uses the browser port [dna2ai/gnugo.js](https://github.com/dna2ai/gnugo.js), which embeds GNU Go. GNU Go is distributed under the GNU General Public License; the corresponding license text is included in `COPYING-GNUGO.txt`. The existing JavaScript engine in `go-ai.js` remains as a fallback if the enhanced engine cannot be loaded.

## Gomoku learning mode

The active website is the standalone Gomoku learning mode in `gomoku.js`. It is an original browser implementation using pattern recognition, tactical threat checks, and Alpha-Beta search; it does not load the legacy Go puzzle or GNU Go scripts. The algorithm choice was informed by publicly documented Gomoku approaches, including [kevin2014123/gomoku-ai](https://github.com/kevin2014123/gomoku-ai), whose project documents Minimax, Alpha-Beta pruning, iterative deepening, move ordering, and pattern evaluation under GPL-3.0. No code from that project is included here.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
