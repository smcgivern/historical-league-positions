This is a small charting page using [D3.js][d3] to show the historical
league positions of football clubs in the English leagues over time.

The `build/` directory contains a Rakefile with instructions on
creating the data. A small amount of this needs to be hand-edited
(mapping team names to team IDs, for instance, and collecting data for
the last few seasons) but the majority comes from the wonderful
[RSSSF][rsssf].

There's no particular reason for its existence, I just wanted to see
the rises and falls of teams like Swansea and Southampton in a
graphical form!

[d3]: http://d3js.org/
[rsssf]: http://www.rsssf.com/
