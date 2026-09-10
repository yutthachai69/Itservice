BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[Site] (
    [code] NVARCHAR(2) NOT NULL,
    [name] NVARCHAR(50) NOT NULL,
    CONSTRAINT [Site_pkey] PRIMARY KEY CLUSTERED ([code])
);

-- CreateTable
CREATE TABLE [dbo].[Department] (
    [id] INT NOT NULL IDENTITY(1,1),
    [siteCode] NVARCHAR(2) NOT NULL,
    [name] NVARCHAR(150) NOT NULL,
    CONSTRAINT [Department_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Department_siteCode_name_key] UNIQUE NONCLUSTERED ([siteCode],[name])
);

-- CreateTable
CREATE TABLE [dbo].[User] (
    [id] INT NOT NULL IDENTITY(1,1),
    [username] NVARCHAR(100) NOT NULL,
    [displayName] NVARCHAR(150) NOT NULL,
    [email] NVARCHAR(150),
    [position] NVARCHAR(150),
    [phone] NVARCHAR(50),
    [siteCode] NVARCHAR(2),
    [departmentId] INT,
    [role] NVARCHAR(20) NOT NULL CONSTRAINT [User_role_df] DEFAULT 'USER',
    [active] BIT NOT NULL CONSTRAINT [User_active_df] DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [User_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [User_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [User_username_key] UNIQUE NONCLUSTERED ([username])
);

-- CreateTable
CREATE TABLE [dbo].[Approver] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] NVARCHAR(150) NOT NULL,
    [type] NVARCHAR(20) NOT NULL,
    [active] BIT NOT NULL CONSTRAINT [Approver_active_df] DEFAULT 1,
    CONSTRAINT [Approver_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Ticket] (
    [id] INT NOT NULL IDENTITY(1,1),
    [docNo] NVARCHAR(20) NOT NULL,
    [formType] NVARCHAR(10) NOT NULL,
    [siteCode] NVARCHAR(2) NOT NULL,
    [requesterId] INT NOT NULL,
    [reqName] NVARCHAR(150) NOT NULL,
    [reqDept] NVARCHAR(150),
    [reqPosition] NVARCHAR(150),
    [reqPhone] NVARCHAR(50),
    [reqEmail] NVARCHAR(150),
    [serviceSiteCode] NVARCHAR(2) NOT NULL,
    [status] NVARCHAR(20) NOT NULL CONSTRAINT [Ticket_status_df] DEFAULT 'OPEN',
    [itStatus] NVARCHAR(20) NOT NULL CONSTRAINT [Ticket_itStatus_df] DEFAULT 'NEW',
    [userStatus] NVARCHAR(100) NOT NULL,
    [assignedToId] INT,
    [closedById] INT,
    [checkedById] INT,
    [notifyEmail] BIT NOT NULL CONSTRAINT [Ticket_notifyEmail_df] DEFAULT 0,
    [note] NVARCHAR(max),
    [formData] NVARCHAR(max) NOT NULL,
    [slaHours] INT NOT NULL CONSTRAINT [Ticket_slaHours_df] DEFAULT 24,
    [slaDueAt] DATETIME2,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Ticket_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [receivedAt] DATETIME2,
    [resolvedAt] DATETIME2,
    [closedAt] DATETIME2,
    CONSTRAINT [Ticket_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Ticket_docNo_key] UNIQUE NONCLUSTERED ([docNo])
);

-- CreateTable
CREATE TABLE [dbo].[TicketAttachment] (
    [id] INT NOT NULL IDENTITY(1,1),
    [ticketId] INT NOT NULL,
    [filename] NVARCHAR(260) NOT NULL,
    [storedName] NVARCHAR(260) NOT NULL,
    [size] INT NOT NULL,
    [mimeType] NVARCHAR(120),
    [uploadedAt] DATETIME2 NOT NULL CONSTRAINT [TicketAttachment_uploadedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [TicketAttachment_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[TicketEvent] (
    [id] INT NOT NULL IDENTITY(1,1),
    [ticketId] INT NOT NULL,
    [actorId] INT,
    [action] NVARCHAR(40) NOT NULL,
    [fromStatus] NVARCHAR(20),
    [toStatus] NVARCHAR(20),
    [comment] NVARCHAR(max),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [TicketEvent_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [TicketEvent_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[TicketApproval] (
    [id] INT NOT NULL IDENTITY(1,1),
    [ticketId] INT NOT NULL,
    [step] NVARCHAR(20) NOT NULL,
    [seq] INT NOT NULL,
    [approverId] INT,
    [status] NVARCHAR(20) NOT NULL CONSTRAINT [TicketApproval_status_df] DEFAULT 'PENDING',
    [comment] NVARCHAR(max),
    [actedAt] DATETIME2,
    CONSTRAINT [TicketApproval_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Evaluation] (
    [id] INT NOT NULL IDENTITY(1,1),
    [ticketId] INT NOT NULL,
    [raterId] INT,
    [score] INT NOT NULL,
    [comment] NVARCHAR(max),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Evaluation_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [Evaluation_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Evaluation_ticketId_key] UNIQUE NONCLUSTERED ([ticketId])
);

-- CreateTable
CREATE TABLE [dbo].[DocCounter] (
    [period] NVARCHAR(4) NOT NULL,
    [seq] INT NOT NULL CONSTRAINT [DocCounter_seq_df] DEFAULT 0,
    CONSTRAINT [DocCounter_pkey] PRIMARY KEY CLUSTERED ([period])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Ticket_formType_status_idx] ON [dbo].[Ticket]([formType], [status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Ticket_siteCode_idx] ON [dbo].[Ticket]([siteCode]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Ticket_createdAt_idx] ON [dbo].[Ticket]([createdAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [TicketEvent_ticketId_idx] ON [dbo].[TicketEvent]([ticketId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [TicketApproval_ticketId_idx] ON [dbo].[TicketApproval]([ticketId]);

-- AddForeignKey
ALTER TABLE [dbo].[Department] ADD CONSTRAINT [Department_siteCode_fkey] FOREIGN KEY ([siteCode]) REFERENCES [dbo].[Site]([code]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[User] ADD CONSTRAINT [User_siteCode_fkey] FOREIGN KEY ([siteCode]) REFERENCES [dbo].[Site]([code]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[User] ADD CONSTRAINT [User_departmentId_fkey] FOREIGN KEY ([departmentId]) REFERENCES [dbo].[Department]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Ticket] ADD CONSTRAINT [Ticket_siteCode_fkey] FOREIGN KEY ([siteCode]) REFERENCES [dbo].[Site]([code]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Ticket] ADD CONSTRAINT [Ticket_requesterId_fkey] FOREIGN KEY ([requesterId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Ticket] ADD CONSTRAINT [Ticket_serviceSiteCode_fkey] FOREIGN KEY ([serviceSiteCode]) REFERENCES [dbo].[Site]([code]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Ticket] ADD CONSTRAINT [Ticket_assignedToId_fkey] FOREIGN KEY ([assignedToId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Ticket] ADD CONSTRAINT [Ticket_closedById_fkey] FOREIGN KEY ([closedById]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Ticket] ADD CONSTRAINT [Ticket_checkedById_fkey] FOREIGN KEY ([checkedById]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[TicketAttachment] ADD CONSTRAINT [TicketAttachment_ticketId_fkey] FOREIGN KEY ([ticketId]) REFERENCES [dbo].[Ticket]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[TicketEvent] ADD CONSTRAINT [TicketEvent_ticketId_fkey] FOREIGN KEY ([ticketId]) REFERENCES [dbo].[Ticket]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[TicketEvent] ADD CONSTRAINT [TicketEvent_actorId_fkey] FOREIGN KEY ([actorId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[TicketApproval] ADD CONSTRAINT [TicketApproval_ticketId_fkey] FOREIGN KEY ([ticketId]) REFERENCES [dbo].[Ticket]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[TicketApproval] ADD CONSTRAINT [TicketApproval_approverId_fkey] FOREIGN KEY ([approverId]) REFERENCES [dbo].[Approver]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Evaluation] ADD CONSTRAINT [Evaluation_ticketId_fkey] FOREIGN KEY ([ticketId]) REFERENCES [dbo].[Ticket]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Evaluation] ADD CONSTRAINT [Evaluation_raterId_fkey] FOREIGN KEY ([raterId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
