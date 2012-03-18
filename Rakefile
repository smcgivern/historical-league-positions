require 'rake/clean'
require 'json'

FILES = {
  :seasons => 'rsssf-seasons.json',
  :teams => 'teams.json',
  :teams_mapping => 'teams.txt',
  :seasons_mapped => 'rsssf-seasons-mapped.json',
}

CLOBBER.push(*FileList[FILES.values])

desc 'List the unique team names from the seasons file.'
task :list_teams do
  puts load_json(FILES[:seasons]).
    map {|s, e| e.map {|d| d['table'].map {|t| t[2]}}}.
    flatten.uniq.sort
end

desc 'List the divisions from the seasons file with the header size.'
task :list_divisions do
  puts load_json(FILES[:seasons]).
    map {|s, e| e.map {|d|
      "#{d['info'].join(', ')} (#{d['header'].size})"
    }}.flatten.uniq.sort
end

# The teams.txt file needs to be created by hand; use the list_teams
# task to help. The format is just <ID>=<name>, where <name> is from
# the seasons file.
#
desc 'Create JSON teams file from the teams mapping list.'
file FILES[:teams] do
  puts ['Creating mapping in ', FILES[:teams], ' from ',
        FILES[:teams_mapping]].join

  team_list = {}

  open(FILES[:teams_mapping]).each_line do |line|
    id, name = *line.strip.split('=')

    team_list[id] ||= []
    team_list[id] << name
  end

  puts ['Writing ', team_list.values.flatten.size, ' names to ',
        team_list.keys.size, ' IDs'].join

  write_json(FILES[:teams], team_list)
end

desc 'Map the team IDs from create_team_mapping to the seasons file.'
file FILES[:seasons_mapped] => [FILES[:teams], FILES[:seasons]] do
  teams = {}
  seasons = load_json(FILES[:seasons])

  load_json(FILES[:teams]).each do |id, names|
    names.each {|n| teams[n] = id}
  end

  seasons.each do |season, divisions|
    divisions.each_with_index do |division, i|
      division['table'].each_with_index do |row, j|
        seasons[season][i]['table'][j][2] = teams[row[2]]
      end
    end
  end

  puts ['Replacing names in ', FILES[:seasons], ' with IDs from ',
        FILES[:teams], ' in ', FILES[:seasons_mapped]].join

  write_json(FILES[:seasons_mapped], seasons)
end

# Parses league tables from the RSSSF. Positional command-line
# arguments are:
# 1) starting year;
# 2) finishing year (beginning of final season);
# 3) base address, tables will be found from the #year_to_season form
#    of the year.
#
# This assumes that the tables will be in the format found at:
#   http://www.rsssf.com/engpaul/FLA/league.html
#
desc 'Parse league tables from the RSSSF. See rsssf_parsing.rb.'
file FILES[:seasons], [:start, :finish, :base] do |t, args|
  require 'rsssf_parsing'

  args.with_defaults(:start => 1888,
                     :finish => 2007,
                     :base => 'http://www.rsssf.com/engpaul/FLA/')

  seasons = {}
  range = (args[:start].to_i)..(args[:finish].to_i)

  range.map {|y| year_to_season(y)}.each do |season|
    begin
      page = Nokogiri::HTML(open("#{args[:base]}#{season}.html").read)
    rescue OpenURI::HTTPError
      next
    end

    tier = 1

    page.search('pre').each do |pre|
      divisions, tier = *parse_rsssf_tables(pre.inner_text, tier)
      seasons[season] ||= []
      seasons[season] += divisions if divisions
    end
  end

  open(FILES[:seasons], 'w').puts(JSON.pretty_generate(seasons))
end

def load_json(f); c = open(f).read; JSON.parse(c); end

def write_json(filename, obj)
  file = open(filename, 'w')
  file.puts(JSON.pretty_generate(obj))
  file.close
end

# Load any .rake files in the same directory.
#
Dir['*.rake'].each {|t| load(t)}
