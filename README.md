<img align="left" width="100" height="100" style="margin: 25px 25px 5px 5px" src="discipl.svg">

# discipl-paper-wallet

Note: documentation below is out of date:

library for creating paper wallets consisting of a QR holding an attested claim as a verifiable credential

issue(attestLink)

Exports a single attestation claim together with the claim it attests and puts this information in a QR code

validate(did)

Scans for a QR code created through issue(), imports the claim and attestation into the same channel on the same platforms as it was exported from and validating them (if a proper platform suitable for this usage is used like ephemeral) as valid attestation of the given did.

Note that the import method might not yet have been added within the discipl core api
Note that in case of DLT platforms, this import method does not (have to) import anything as the claims should have been synchronized and validated between nodes within the platform. In these cases an actual import is just skipped by the connector for those platforms, it might check that what you are trying to import already exists. In other cases platforms can only provide in trust when its implementation checks for a signature that has to be contained within the link of the claims to correspond with the did for which to import them.
