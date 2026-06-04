import React from "react";
import { FaSearch } from "react-icons/fa";
import styles from "./Admins.module.css";

function AdminItem({ admin, selected, onClick, number }) {
  return (
    <div
      onClick={() => onClick(admin)}
      className={`${styles.adminRow} ${selected ? styles.adminRowSelected : ""}`}
    >
      <div className={`${styles.rowIndex} ${selected ? styles.rowIndexSelected : ""}`}>{number}</div>
      <img
        src={admin.profileImage}
        alt={admin.name}
        className={`${styles.adminAvatar} ${selected ? styles.adminAvatarSelected : ""}`}
      />
      <div>
        <h3 className={styles.adminName}>{admin.name}</h3>
        <p className={styles.adminMeta}>{admin.title || admin.username || admin.email || "Management"}</p>
      </div>
    </div>
  );
}

function AdminList({
  searchTerm,
  setSearchTerm,
  loading,
  error,
  filteredAdmins,
  selectedAdmin,
  onSelect,
}) {
  return (
    <>
      <div className={styles.searchRow}>
        <div className={styles.searchBox}>
          <FaSearch className={styles.searchIcon} />
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search management..."
            className={styles.searchInput}
          />
        </div>
      </div>

      {loading && <p className={styles.loadingText}>Loading admins...</p>}
      {error && <p className={styles.errorText}>{error}</p>}
      {!loading && !error && filteredAdmins.length === 0 && (
        <p className={styles.mutedText}>No management contacts found.</p>
      )}

      <div className={styles.listStack}>
        {filteredAdmins.map((admin, index) => (
          <AdminItem
            key={admin.adminId}
            admin={admin}
            number={index + 1}
            selected={selectedAdmin?.adminId === admin.adminId}
            onClick={onSelect}
          />
        ))}
      </div>
    </>
  );
}

export default AdminList;
