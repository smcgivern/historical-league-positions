This is a small charting page using [D3.js][d3] to show the historical
league positions of football clubs in the English leagues over time.

The `build/` directory contains a Rakefile with instructions on
creating the data. A small amount of this needs to be hand-edited
(mapping team names to team IDs, for instance, and collecting data for
the last few seasons) but the majority comes from the wonderful
[RSSSF][rsssf]. To build, here's the process I used:

1. in `build`, run `asdf install` and `bundle install`;
2. in `build/`, run `bundle exec rake rsssf-seasons.json` to pull the
   RSSSF data;
3. add extra files in TSV format to `build/manual/` (see Rakefile for
   details);
4. run `bundle exec rake add_tsvs[$dir]`;
5. `bundle exec rake list_teams > teams.txt` and add keys to any teams
   missing (nothing on the left-hand side of the `=`);
6. `bundle exec rake list_tiers > tiers.txt`, same again;
7. `bundle exec rake football-league-positions.json
   historical-league-positions.csv` for the final files to go into `ext/`.

There's no particular reason for its existence, I just wanted to see
the rises and falls of teams like Swansea and Southampton in a
graphical form!

[d3]: http://d3js.org/
[rsssf]: http://www.rsssf.com/
