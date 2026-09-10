BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[LoanItem] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] NVARCHAR(120) NOT NULL,
    [category] NVARCHAR(30) NOT NULL,
    [serial] NVARCHAR(60),
    [assetNo] NVARCHAR(30),
    [siteCode] NVARCHAR(2) NOT NULL,
    [status] NVARCHAR(20) NOT NULL CONSTRAINT [LoanItem_status_df] DEFAULT 'AVAILABLE',
    [note] NVARCHAR(max),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [LoanItem_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [LoanItem_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Loan] (
    [id] INT NOT NULL IDENTITY(1,1),
    [itemId] INT NOT NULL,
    [ticketId] INT,
    [borrowerName] NVARCHAR(150) NOT NULL,
    [borrowDate] DATETIME2 NOT NULL,
    [dueDate] DATETIME2 NOT NULL,
    [returnedAt] DATETIME2,
    [status] NVARCHAR(20) NOT NULL CONSTRAINT [Loan_status_df] DEFAULT 'ONLOAN',
    [note] NVARCHAR(max),
    [createdById] INT,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Loan_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [Loan_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [LoanItem_category_idx] ON [dbo].[LoanItem]([category]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [LoanItem_siteCode_idx] ON [dbo].[LoanItem]([siteCode]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Loan_itemId_idx] ON [dbo].[Loan]([itemId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Loan_ticketId_idx] ON [dbo].[Loan]([ticketId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Loan_status_idx] ON [dbo].[Loan]([status]);

-- AddForeignKey
ALTER TABLE [dbo].[Loan] ADD CONSTRAINT [Loan_itemId_fkey] FOREIGN KEY ([itemId]) REFERENCES [dbo].[LoanItem]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Loan] ADD CONSTRAINT [Loan_ticketId_fkey] FOREIGN KEY ([ticketId]) REFERENCES [dbo].[Ticket]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
