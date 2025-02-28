class PdfDialog {

    init() {

        const options = () => {
            return $.param({
                'headings': $('#pdfHeadings').prop('checked'),
                'nums': $('#pdfNums').prop('checked'),
                'refs': $('#pdfRefs').prop('checked'),
                'quantity': $('#pdfQuantity').val()
            });
        };

        $('#pdfModal').on('shown.bs.modal', (event) => {
            const button = event.relatedTarget;
            const recipient = button.getAttribute('data-bs-view');
            fetch(`${recipient}`)
                .then(response => response.text())
                .then(data => {
                    const modalContent = pdfModal.querySelector('.modal-body');
                    modalContent.innerHTML = `${data}`;
                    $("#pdfDownload").off('click');
                    $("#pdfDownload").on('click', (event) => {
                        const ref = $('#previewContainer').data('ref');
                        const translationId = $('#previewContainer').data('translation');            
                        window.open(`/pdf/ref/${translationId}/${ref}?${options()}`);
                        $('#pdfDownload').blur();
                        bootstrap.Modal.getInstance($('#pdfModal')).hide();
                    });        
                }
                )   .catch((e) => {
                    console.log("Error loading content", e);
                }
                );
        });
    };

}

export default function initPdfModal() {
    new PdfDialog().init();
}