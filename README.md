This is a small charting page using [D3.js][d3] to show the historical
league positions of football clubs in the English leagues over time.

The `build/` directory contains a Rakefile with instructions on
creating the data. A small amount of this needs to be hand-edited
(mapping team names to team IDs, for instance, and collecting data for
the last few seasons) but the majority comes from the wonderful
[RSSSF][rsssf]. To build, here's the process I used:

1. in `build/`, run `rake rsssf-seasons.json` to pull the RSSSF data;
2. add extra files in TSV format to `build/manual/` (see Rakefile for
   details);
3. run `rake add_tsvs`;
4. `rake list_teams > teams.txt` and edit that file to be key=value;
5. `rake list_tiers > tiers.txt`, same again;
6. `rake football-league-positions.json` for the final file to go into
   `ext/`.

There's no particular reason for its existence, I just wanted to see
the rises and falls of teams like Swansea and Southampton in a
graphical form!

[d3]: http://d3js.org/
[rsssf]: http://www.rsssf.com/
