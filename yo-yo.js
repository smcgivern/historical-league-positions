var defaultTeams = ['accrington-stanley', 'everton', 'huddersfield', 'swansea',
                    'wigan-athletic'];

var allSeasons = null;
var allTeams = null;

d3.json('seasons-reordered.json', function(s) {
    allSeasons = s;

    d3.json('teams.json', function(t) {
        allTeams = t;

        createTeamSelector(allTeams);
        selectTeams(defaultTeams);
    });
});

// Create an element by name with optional text content and attributes.
//
function element(name, content, attributes) {
    var e = $(document.createElement(name));

    if (content) { e.append(content); }
    for (a in attributes) { e.attr(a, attributes[a]); }

    return e;
}

function createTeamSelector(teams) {
    var teamList = $('#teams-unselected');
    var teamIDs = [];

    // Enable the filter box, which hides all items that don't match
    // the filter in their label's title. (The title attribute for the
    // label contains all of the team names found.)
    $('#team-filter').keyup(function() {
        var filter = $(this).val().toLowerCase();

        $('#teams-unselected > li').show().filter(function() {
            var comparator = $('label', this).attr('title').toLowerCase();

            return (comparator.indexOf(filter) === -1);
        }).hide();
    });

    // Get a list of team IDs and put in alphabetical order.
    for (var team in teams) { teamIDs.push(team); }
    teamIDs.sort();

    for (var i = 0; i < teamIDs.length; i++) {
        var id = teamIDs[i];
        var team = teams[id];

        var label = element('label', team[0],
                            {'for': teamID(id), 'title': team.join(', ')});

        var input = element('input', '',
                            {'id': teamID(id), 'type': 'checkbox'});

        // A filled box for the chart key / legend.
        var key = element('span', '&#9632;', {'class': 'key'});

        input.change(function() { moveTeam($(this).parent()); redrawChart(); });

        teamList.append(element('li').append(key).append(input).append(label));
    }

    $('#team-selector').show();
}

// Moves a team from the selected to unselected list, or vice versa. Inserts in
// alphabetical order by team ID.
//
function moveTeam(team) {
    var id = teamID(team);
    var inserted = false;

    var destination = '#teams-' +
            ($('input', team).attr('checked') ? '' : 'un') +
            'selected';

    $(destination + ' > li').each(function(i, item) {
        if (id < teamID(item) && !inserted) {
            $(item).before(team);

            inserted = true;
        }});

    if (!inserted) { $(destination).append(team); }
}

// If given a string, returns the team ID ('team-liverpool', for instance).
//
// If given a jQuery object, finds the ID attribute of the first input element
// it contains, and removes the 'team-' prefix from that.
//
function teamID(team) {
    if (team.substring) { return 'team-' + team; }

    return (team.id || $('input', team)[0].id).slice(5);
}

// Clear the chart and draw it with only the teams who are checked.
//
function redrawChart() {
    var teams = $.map($('#team-list input:checked'), teamID);

    $('#chart').empty();

    drawChart(allSeasons, 'effective-position', teams.sort());
}

// Clear the currently selected teams and instead check all of the teams in the
// list passed.
//
function selectTeams(teams) {
    $('#team-list input:checked').prop('checked', false);

    for (var i = 0; i < teams.length; i++) {
        $('#' + teamID(teams[i])).prop('checked', true).change();
    }
}

function drawChart(seasons, key, chartTeams) {
    var charting = {},
        chartKeys = {'x': [], 'y': [], 'z': []},
        chartData = [];

    for (var i = 0; i < seasons.length; i++) {
        var teams = seasons[i]['teams'];
        chartKeys['x'].push(seasons[i]['season']);

        for (var j = 0; j < chartTeams.length; j++) {
            var team = chartTeams[j];

            if (!charting.hasOwnProperty(team)) { charting[team] = []; }

            if (teams.hasOwnProperty(team)) {
                var item = teams[team];

                item['season'] = seasons[i]['season'];

                charting[team].push(item);
            }
        }
    }

    for (var team in charting) {
        chartKeys['z'].push(team);
        chartData.push(charting[team]);
    }

    var w = 800,
        h = 300,
        p = 20,
        x = d3.scale.linear().domain([1880, 2010]).range([0, w]),
        y = d3.scale.linear().domain([0, 100]).range([0, h]);

    var vis = d3.select('#chart')
            .append('svg')
            .attr('width', w + p * 2)
            .attr('height', h + p * 2)
            .append('g')
            .attr('transform', 'translate(' + p + ',' + p + ')');

    var line = d3.svg.line()
            .x(function(d) { return x(parseInt(d['season'])); })
            .y(function(d) { return y(d[key]); });

    var lines = vis.selectAll('.line')
            .data(chartData);

    var color = d3.scale.category10();

    lines.enter()
        .append('path')
        .attr('d', function(d) { var l = line(d); return l; })
        .attr('class', 'line')
        .attr('fill', 'none')
        .attr('stroke-width', 2)
        .attr('stroke', function(d, i) { return color(chartKeys.z[i]); });

    // Colour in the legend items with the line colours.
    $.each(chartTeams, function(i, team) {
        $('.key', $('#' + teamID(team)).parent()).css('color', color(team));
    });
}
