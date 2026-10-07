"use client";

import { memo, useImperativeHandle } from "react";

import { LIST_BOX_CLASS, tabStop, useFocusRow, useListNavigation, type ListProps } from "./list-navigation";
import { TicketRow } from "./ticket-row";
import { ticketStore } from "./tickets";
import { useVirtualizer } from "./use-virtualizer";

/** Renders only the rows near the viewport inside a full-height spacer. */
export const VirtualList = memo(function VirtualList({
  keys, positions, count, activeKey, selectedKey, onActiveChange, onSelect, debug, anchorRef, apiRef,
  estimate, overscan,
}: ListProps & { estimate: number; overscan: number }) {
  const tabKey = tabStop(keys, positions, activeKey);

  const { boxRef, spacerRef, snapshot, layout } = useVirtualizer({
    keys,
    positions,
    count,
    estimate,
    overscan,
    pinnedKey: tabKey,
    keepKeys: [selectedKey, activeKey],
    anchorRef,
  });
  const focusKey = useFocusRow(boxRef);
  const { handleKeyDown, handleFocus, handleClick } = useListNavigation(layout, {
    onActiveChange,
    onSelect,
    focusKey,
  });

  useImperativeHandle(apiRef, () => ({ reveal: layout.reveal, focusKey }), [layout, focusKey]);

  return (
    <div
      ref={boxRef}
      role="listbox"
      aria-label="Tickets"
      className={LIST_BOX_CLASS}
      onKeyDown={handleKeyDown}
      onFocus={handleFocus}
      onClick={handleClick}
    >
      <div ref={spacerRef} role="presentation" className="relative" style={{ height: snapshot.total }}>
        {snapshot.rows.map((row) => (
          <TicketRow
            key={row.key}
            ticket={ticketStore.get(row.key)}
            position={row.index + 1}
            setSize={keys.length}
            tabbable={row.key === tabKey}
            selected={row.key === selectedKey}
            offset={row.offset}
            debug={debug ? row : null}
          />
        ))}
      </div>
    </div>
  );
});
