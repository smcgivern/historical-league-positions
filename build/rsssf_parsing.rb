require 'open-uri'
require 'nokogiri'

# Takes a four-digit year and returns it in 'season notation' for the
# season beginning in that year.
#
#   year_to_season(1888) #=> '1888-89'
#   year_to_season(1999) #=> '1999-00'
#   year_to_season(2001) #=> '2001-02'
#
def year_to_season(y); "#{y}-#{sprintf('%02d', (y + 1) % 100)}"; end

# Tidies up team names allowing for all-caps, asterisks, and common
# abbreviations.
#
#   fix_team_name('RUSHDEN & DIAMONDS')   #=> 'Rushden & Diamonds'
#   fix_team_name('Burton*')              #=> 'Burton'
#   fix_team_name('AFC BOURNEMOUTH')      #=> 'AFC Bournemouth'
#   fix_team_name('Leigh RMI')            #=> 'Leigh RMI'
#   fix_team_name("QUEEN'S PARK RANGERS") #=> "Queen's Park Rangers"
#
def fix_team_name(team)
  team.split.map {|w| w.capitalize}.join(' ').
    gsub('.', '').
    match(/[A-z &']+/)[0].
    gsub(/((Af|F)c|Rmi)/) {|w| w.upcase}.
    strip
end

# Pulls all tables for the year out of the text and returns them in an
# array with each item being a division hash, where:
# * +:header+ is the table column headers;
# * +:info+ is all lines around the table apart from the header;
# * +:tier+ is a guess at the level played, where 1 is highest;
# * +:table+ is the table itself.
#
# Team names are normalized with #fix_team_name but the first item in
# the table, 'Caps', indicates whether or not a team was in
# capitals. (This indicates promoted and relegated teams, as well as
# the league winners.)
#
# +place+ is the marker for table rows so if the table does not begin
# in a form like the below, it will not be recognised:
#    1. NEWCASTLE UNITED [...]
#    2. Huddersfield Town [...]
#   10. Aston Villa [...]
#   22. WEST BROMWICH ALBION [...]
#
def parse_rsssf_tables(text, tier=1)
  # Regex segment for a league position. Dot is optional as it's
  # missing in the 1994-95 file on the Premier League table, among
  # others.
  #
  place = '^ *([0-9]+)\.?=? '

  return [nil, tier] unless /#{place}/ === text

  divisions = []
  info = []
  header = ['Caps', 'Pos', 'Team']
  table = []
  table_started = false

  # Add blank line to end to ensure that table can be added to
  # divisions array.
  #
  (text + "\n ").split("\n").each do |line|
    # Not part of a table.
    #
    unless /#{place}/ === line
      if !table_started
        if line.downcase.include?('pts')
          header += line.split
        else
          info << line.strip if line.strip.size > 0
        end
      else
        # Division 3 (North) and Division 3 (South) were at the same
        # level, but the north one is always listed first and so would
        # end up in a higher tier.
        #
        tier -= 1 if info.any? {|x| x.include?('(South)')}

        # Ignore 'non-tables' with information about play-offs, etc.
        #
        unless header.size == 3
          divisions << {
            :info => info,
            :header => header,
            :tier => tier,
            :table => table,
          }
        end

        table_started = false
        tier += 1

        info = []
        header = ['Caps', 'Pos', 'Team']
        table = []
      end

      next
    end

    table_started = true

    # +prefix+ is everything up to and including the first numerical
    # item (+stat+) after the team name - usually games played.
    #
    prefix, pos, team, stat = *line.match(/#{place}(.*?) +([0-9]+)/)

    caps = (team == team.upcase)
    stats = line.gsub(prefix, '').split.map {|x| x.to_i}

    table << [caps, pos.to_i, fix_team_name(team), stat.to_i] + stats
  end

  [divisions, tier]
end
