BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[Asset] (
    [id] INT NOT NULL IDENTITY(1,1),
    [assetNo] NVARCHAR(30) NOT NULL,
    [siteCode] NVARCHAR(2) NOT NULL,
    [assetType] NVARCHAR(40),
    [userName] NVARCHAR(120),
    [userDomain] NVARCHAR(80),
    [department] NVARCHAR(120),
    [brand] NVARCHAR(40),
    [model] NVARCHAR(60),
    [serialNumber] NVARCHAR(60),
    [ipAddress] NVARCHAR(20),
    [status] NVARCHAR(30) NOT NULL CONSTRAINT [Asset_status_df] DEFAULT 'ใช้งาน',
    [note] NVARCHAR(max),
    [data] NVARCHAR(max) NOT NULL,
    [createdById] INT,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Asset_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Asset_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Asset_assetNo_key] UNIQUE NONCLUSTERED ([assetNo])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Asset_siteCode_idx] ON [dbo].[Asset]([siteCode]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Asset_status_idx] ON [dbo].[Asset]([status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Asset_userName_idx] ON [dbo].[Asset]([userName]);

-- AddForeignKey
ALTER TABLE [dbo].[Asset] ADD CONSTRAINT [Asset_createdById_fkey] FOREIGN KEY ([createdById]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
