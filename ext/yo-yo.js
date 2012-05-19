var defaultTeams = ['accrington-stanley', 'everton', 'huddersfield', 'swansea',
                    'wigan-athletic'];

var allSeasons, allTeams, allTiers, allTierSizes;

var charter = chart();

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

// Draw the chart with only the teams who are checked.
//
function redrawChart() {
    var teams = $.map($('#team-list input:checked'), teamID);

    d3.select('#chart').call(charter.chartTeams(teams.sort()).refresh);
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

function chart() {
    var my = {},
        width = 700,
        height = width / 2,
        padding = 20;

    var tierSizes, years, stacked, leagueSize, x, y, xAxis, yAxis;
    var seasons, chartTeams, chartSeasons;

    var stack = d3.layout.stack()
            .values(function(d) { return d['seasons']; })
            .x(function(d) { return toSeason(d); })
            .y(function(d) { return d['size']; })
            .out(function(d, y0, y) { d['size0'] = y0; });

    var area = d3.svg.area()
            .x(function(d) { return x(toSeason(d)); })
            .y0(function(d) { return y(d['size0']); })
            .y1(function(d) { return (y(d['size0'] + d['size'])); });

    var line = d3.svg.line()
            .x(function(d) { return x(toSeason(d)); })
            .y(function(d) { return y(d['effective-position']); })
            .defined(function(d) { return d['effective-position'] > 0; });

    my.width = function(_) {
        if (!arguments.length) return width; width = _; return my;
    };

    my.height = function(_) {
        if (!arguments.length) return height; height = _; return my;
    };

    my.tierSizes = function(_) {
        if (!arguments.length) return tierSizes;

        tierSizes = _;

        years = $.map(tierSizes[0]['seasons'], function(s) {
            return toSeason(s);
        });

        stacked = stack($.extend(true, [], tierSizes));

        leagueSize = d3.max(d3.last(stacked)['seasons'], function(x) {
            return x['size'] + x['size0'];
        });

        x = d3.scale.linear()
            .domain(minMax(years))
            .range([padding * 2, width - padding]);

        y = d3.scale.linear()
            .domain([1, leagueSize])
            .range([0, height - padding]);

        xAxis = d3.svg.axis().scale(x).tickFormat(d3.format('0f'));
        yAxis = d3.svg.axis().scale(y).orient('left');

        return my;
    };

    my.seasons = function(_) {
        if (!arguments.length) return seasons; seasons = _; return my;
    };

    my.chartTeams = function(_) {
        if (!arguments.length) return chartTeams;

        chartTeams = _;

        chartSeasons = my.seasons().filter(function(teamSeasons) {
            return (chartTeams.indexOf(teamSeasons['team']) > -1);
        });

        return my;
    };

    my.refresh = function(selection) {
        selection.each(function() {
            var vis = d3.select(this).select('svg').select('g');

            var color = d3.scale.category10();

            var lines = vis.selectAll('.line')
                    .data(chartSeasons, function (d) { return d['team']; });

            lines.exit().remove();

            lines
                .enter()
                .append('path')
                .attr('d', function(d) { return line(d['seasons']); })
                .attr('class', 'line')
                .attr('fill', 'none')
                .attr('stroke-width', 2);

            lines
                .attr('stroke', function(d) { return color(d['team']); });

            // Colour in the legend items with the line colours.
            $.each(chartTeams, function(i, team) {
                $('.key', $('#' + teamID(team)).parent())
                    .css('color', color(team));
            });
        });
    };

    my.init = function(selection) {
        selection.each(function() {
            d3.select(this).select('svg').remove();

            var vis = d3.select(this)
                    .append('svg')
                    .attr('width', width)
                    .attr('height', height)
                    .append('g')
                    .attr('transform', 'translate(' + padding + ',0)');

            vis.selectAll('.area')
                .data(stacked)
                .enter()
                .append('path')
                .attr('d', function(d) { return area(d['seasons']); })
                .attr('fill', '#eec')
                .attr('opacity', function(d, i) { return .3 + .5 * (i % 2); });

            vis.append('g')
                .attr('transform', 'translate(0,' + (height - padding) + ')')
                .classed('axis', true)
                .call(xAxis);

            vis.append('g')
                .classed('axis', true)
                .attr('transform', 'translate(' + padding * 2 + ',0)')
                .call(yAxis);

            vis.append('text')
                .attr('transform', 'rotate(-90)')
                .attr('x', -height / 2)
                .attr('y', 0)
                .attr('text-anchor', 'middle')
                .text('Overall league position');
        });
    };

    return my;
}

d3.json('ext/football-league-positions.json', function(data) {
    allSeasons = data['seasons'];
    allTeams = data['teams'];
    allTiers = data['tiers'];
    allTierSizes = data['tierSizes'];

    d3.select('#chart').call(charter
                             .tierSizes(allTierSizes)
                             .seasons(allSeasons)
                             .init);

    createTeamSelector(allTeams);
    selectTeams(defaultTeams);
});
