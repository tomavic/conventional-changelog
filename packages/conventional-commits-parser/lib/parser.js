'use strict';
var _ = require('lodash');

function parser(raw, options, regex) {
  if (!raw || !raw.trim()) {
    throw new TypeError('Expected a raw commit');
  }

  if (_.isEmpty(options)) {
    throw new TypeError('Expected options');
  }

  var headerMatch;
  var referenceSentences;
  var referenceMatch;
  var lines = _.compact(raw.split('\n'));
  var continueNote = false;
  var isBody = true;
  var headerCorrespondence = _.map(options.headerCorrespondence, function(part) {
    return part.trim();
  });
  var reNotes = regex.notes;
  var reReferenceParts = regex.referenceParts;
  var reReferences = regex.references;

  // msg parts
  var header = lines.shift();
  var headerParts = {};
  var body = '';
  var footer = '';
  var notes = [];
  var references = [];

  headerMatch = header.match(options.headerPattern);

  if (headerMatch) {
    _.forEach(headerCorrespondence, function(partName, index) {
      var partValue = headerMatch[index + 1] || null;
      headerParts[partName] = partValue;
    });
  } else {
    _.forEach(headerCorrespondence, function(partName) {
      headerParts[partName] = null;
    });
  }

  // incase people reference an issue in the header
  while (referenceSentences = reReferences.exec(header)) {
    var action = referenceSentences[1];
    var sentence = referenceSentences[2];
    while (referenceMatch = reReferenceParts.exec(sentence)) {
      var reference = {
        action: action,
        repository: referenceMatch[1] || null,
        issue: referenceMatch[2],
        raw: referenceMatch[0]
      };
      references.push(reference);
    }
  }

  // body or footer
  _.forEach(lines, function(line) {
    var referenceMatched;

    // this is a new important note
    var notesMatch = line.match(reNotes);
    if (notesMatch) {
      continueNote = true;
      isBody = false;
      footer += line + '\n';

      var note = {
        title: notesMatch[1],
        text: notesMatch[2]
      };
      if (note.text.trim()) {
        note.text += '\n';
      }
      notes.push(note);

      return;
    }

    // this references an issue
    while (referenceSentences = reReferences.exec(line)) {
      var action = referenceSentences[1];
      var sentence = referenceSentences[2];
      while (referenceMatch = reReferenceParts.exec(sentence)) {
        referenceMatched = true;
        continueNote = false;
        isBody = false;
        var reference = {
          action: action,
          repository: referenceMatch[1] || null,
          issue: referenceMatch[2],
          raw: referenceMatch[0]
        };
        references.push(reference);
      }
    }

    if (referenceMatched) {
      footer += line + '\n';

      return;
    }

    // this is the continued important note
    if (continueNote) {
      notes[notes.length - 1].text += line + '\n';
      footer += line + '\n';

      return;
    }

    // this is the body
    if (isBody) {
      body += line + '\n';
    }

    // this is the continued footer
    else {
      footer += line + '\n';
    }
  });

  body = body;
  footer = footer;
  if (!body) {
    body = null;
  }
  if (!footer) {
    footer = null;
  }

  var msg  = _.merge(headerParts, {
    header: header + '\n',
    body: body,
    footer: footer,
    notes: notes,
    references: references
  });

  return msg;
}

module.exports = parser;