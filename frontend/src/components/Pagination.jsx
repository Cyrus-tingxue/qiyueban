import './Pagination.css';

function Pagination({ currentPage, totalPages, onPageChange }) {
    return (
        <div className="pagination">
            <button
                className="pagination-btn"
                disabled={currentPage <= 1}
                onClick={() => onPageChange(currentPage - 1)}
            >
                ＜
            </button>
            <span className="pagination-info">
                {currentPage} / {totalPages}
            </span>
            <button
                className="pagination-btn"
                disabled={currentPage >= totalPages}
                onClick={() => onPageChange(currentPage + 1)}
            >
                ＞
            </button>
        </div>
    );
}

export default Pagination;
