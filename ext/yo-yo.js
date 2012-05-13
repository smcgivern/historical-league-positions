var defaultTeams = ['accrington-stanley', 'everton', 'huddersfield', 'swansea',
                    'wigan-athletic'];

var allSeasons, allTeams, allTiers, allTierSizes;

// Create an element by name with optional text content and attributes.
//
function element(name, content, attributes) {
    var e = $(document.createElement(name));

    if (content) { e.append(content); }
    for (var a in attributes) { e.attr(a, attributes[a]); }

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
    for (var t in teams) { teamIDs.push(t); }
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

// Returns the min and max values of the array, used in the domain of
// a scale.
//
function minMax(a) { return [d3.min(a), d3.max(a)]; }

// Gets the ending year of the season from the object.
//
function toSeason(o) { return parseInt(o['season']) + 1; }

function drawChart(seasons, key, chartTeams) {
    var chartSeasons = seasons.filter(function(teamSeasons) {
        return (chartTeams.indexOf(teamSeasons['team']) > -1);
    });

    var years = $.map(chartSeasons[0]['seasons'], function(s) {
        return toSeason(s);
    });

    var w = 700,
        h = 300,
        p = 20,
        x = d3.scale.linear().domain(minMax(years)).range([p * 2, w - p]),
        y = d3.scale.linear().domain([1, 110]).range([0, h - p]),
        xAxis = d3.svg.axis().scale(x).tickFormat(d3.format('0f')),
        yAxis = d3.svg.axis().scale(y).orient('left'),
        tiers = [];

    var vis = d3.select('#chart')
            .append('svg')
            .attr('width', w)
            .attr('height', h)
            .append('g')
            .attr('transform', 'translate(' + p + ',0)');

    var line = d3.svg.line()
            .x(function(d) { return x(parseInt(d['season'])); })
            .y1(function(d) { return y(d[key]); });

    var line = d3.svg.line()
            .x(function(d) { return x(toSeason(d); })
            .y(function(d) { return y(d[key]); })
            .defined(function(d) { return d[key] > 0; });

    var color = d3.scale.category10();

    vis.selectAll('.line')
        .data(chartSeasons)
        .enter()
        .append('path')
        .attr('d', function(d) { return line(d['seasons']); })
        .attr('class', 'line')
        .attr('fill', 'none')
        .attr('stroke-width', 2)
        .attr('stroke', function(d) { return color(d['team']); });

    vis.append('g')
        .attr('transform', 'translate(0,' + (h - p) + ')')
        .classed('axis', true)
        .call(xAxis);

    vis.append('g')
        .classed('axis', true)
        .attr('transform', 'translate(' + p * 2 + ',0)')
        .call(yAxis);

    vis.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -h/2)
        .attr('y', 0)
        .attr('text-anchor', 'middle')
        .text('League position');

    // Colour in the legend items with the line colours.
    $.each(chartTeams, function(i, team) {
        $('.key', $('#' + teamID(team)).parent()).css('color', color(team));
    });
}

d3.json('ext/football-league-positions.json', function(data) {
    allSeasons = data['seasons'];
    allTeams = data['teams'];
    allTiers = data['tiers'];
    allTierSizes = data['tierSizes'];

    createTeamSelector(allTeams);
    selectTeams(defaultTeams);
});
