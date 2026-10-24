function cell(value) {
  let text = value === undefined || value === null ? "" : String(value);
  if (/^[\s\u0000-\u001f]*[=+\-@]/u.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}

export function exportCsv(dataset, ids = []) {
  const selected = new Set(ids);
  const rows = [
    [
      "person_id",
      "name",
      "party",
      "office",
      "district",
      "status",
      "election_year",
      "profile_source",
      "evidence_type",
      "issue",
      "evidence_title",
      "summary",
      "date",
      "stance",
      "verification",
      "source_url",
      "source_label",
      "context",
    ],
  ];
  for (const person of dataset.people) {
    if (selected.size && !selected.has(person.id)) continue;
    const records = dataset.evidence.filter(
      (entry) => entry.personId === person.id,
    );
    for (const evidence of records.length ? records : [null])
      rows.push([
        person.id,
        person.name,
        person.party,
        person.office,
        person.district,
        person.status,
        person.electionYear,
        person.officialUrl,
        evidence?.type,
        evidence?.issue,
        evidence?.title,
        evidence?.summary,
        evidence?.date,
        evidence?.stance ?? "not_recorded",
        evidence?.verification,
        evidence?.sourceUrl,
        evidence?.sourceLabel,
        evidence?.context,
      ]);
  }
  return (
    "\uFEFF" + rows.map((row) => row.map(cell).join(",")).join("\r\n") + "\r\n"
  );
}
