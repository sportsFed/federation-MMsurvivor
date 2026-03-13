// Inside your Standings loop
{entries.map((entry) => (
  <tr key={entry.id}>
    <td className="p-2 font-bold">{entry.displayName}</td>
    <td className="p-2 text-right">{entry.totalPoints}</td>
    <td className="p-2 text-center">
      {entry.isEliminated ? '❌' : '✅'}
    </td>
  </tr>
))}
