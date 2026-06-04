import React from "react";
import { FaSearch } from "react-icons/fa";
import { FixedSizeList as List } from "react-window";
import styles from "./Parents.module.css";

function ParentRowItem({ parent, index, selected, onClick }) {
  return (
    <div
      onClick={() => onClick(parent)}
      className={`${styles.parentRow} ${selected ? styles.parentRowSelected : ""}`}
    >
      <div className={`${styles.parentIndex} ${selected ? styles.parentIndexSelected : ""}`}>
        {index}
      </div>
      <img
        src={parent.profileImage}
        alt={parent.name}
        onError={(e) => { e.currentTarget.src = "/default-profile.png"; }}
        className={`${styles.parentAvatar} ${selected ? styles.parentAvatarSelected : ""}`}
      />
      <div style={{ minWidth: 0 }}>
        <h3 className={styles.parentName}>{parent.name}</h3>
        <p className={styles.parentEmail}>{parent.email}</p>
        <p className={styles.parentChildCount}>
          {(parent.children || []).length}{" "}
          {(parent.children || []).length === 1 ? "Child" : "Children"}
        </p>
      </div>
    </div>
  );
}

function ParentList({
  searchTerm,
  setSearchTerm,
  isLoadingParents,
  parentListError,
  filteredParents,
  paginatedParents,
  isLoadingNext,
  goNext,
  hasMore,
  selectedParent,
  onSelectParent,
}) {
  return (
    <>
      <div className={styles.searchRow}>
        <div className={styles.searchBox}>
          <FaSearch className={styles.searchIcon} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search parents..."
            className={styles.searchInput}
          />
        </div>
      </div>

      {isLoadingParents && <p className={styles.loadingText}>Loading parents...</p>}
      {parentListError && <p className={styles.errorText}>{parentListError}</p>}
      {!isLoadingParents && !parentListError && filteredParents.length === 0 && (
        <p className={styles.mutedText}>No parents found.</p>
      )}

      {!isLoadingParents && !parentListError && paginatedParents.length > 0 && (
        <div className={styles.listStack}>
          <div className={styles.listResponsive}>
            <List
              height={500}
              itemCount={paginatedParents.length + (isLoadingNext ? 1 : 0)}
              itemSize={84}
              width="100%"
              onItemsRendered={({ visibleStopIndex }) => {
                if (visibleStopIndex >= paginatedParents.length - 3 && hasMore && !isLoadingNext) {
                  goNext();
                }
              }}
            >
              {({ index, style }) => {
                if (index === paginatedParents.length) {
                  return (
                    <div style={style} className={styles.loadingRow}>
                      <div className={styles.loadingInline}>
                        <span className={styles.spinner} />
                        Loading...
                      </div>
                    </div>
                  );
                }

                const parent = paginatedParents[index];
                if (!parent) return null;

                return (
                  <div style={style} className={styles.listItemWrap}>
                    <ParentRowItem
                      parent={parent}
                      index={index + 1}
                      selected={selectedParent?.id === parent.id}
                      onClick={onSelectParent}
                    />
                  </div>
                );
              }}
            </List>
          </div>
        </div>
      )}
    </>
  );
}

export default ParentList;
